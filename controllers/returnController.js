// controllers/returnController.js
const ReturnRequest = require('../model/ReturnRequest');
const WorkAssignment = require('../model/WorkAssignment'); // Your existing model
const InventoryLedger = require('../model/InventoryLedger');
const Product = require('../model/product');
const mongoose = require('mongoose');

/**
 * @desc    Submit a new return request for approval
 * @route   POST /api/return-requests/submit
 * @access  Private (Admin/Jobworker)
 */
exports.submitReturnRequest = async (req, res) => {
    console.log(req.body, "Data in submit request to return product stok in assignment");

    const {
        assignmentId,
        jobworkerId, // This is your submittedBy
        cleared = 0,
        shortage = 0,
        seconds = 0
    } = req.body;

    // --- 👇 ADD THIS ---
    const session = await mongoose.startSession();
    session.startTransaction();
    // --- END ADD ---

    try {
        // 1. Basic Validation
        if (!assignmentId || !jobworkerId) {
            throw new Error("assignmentId and jobworkerId are required.");
        }
        const totalToAccountFor = cleared + shortage + seconds;
        if (totalToAccountFor <= 0) {
            throw new Error("You must provide a quantity greater than zero.");
        }

        // 2. Find and Validate Assignment
        // --- 👇 ADD .session(session) ---
        const assignment = await WorkAssignment.findById(assignmentId).session(session);
        if (!assignment) {
            throw new Error("Work assignment not found.");
        }

        // 3. NEW CHECK: See if a request is ALREADY pending
        if (assignment.activeReturnRequestId) {
            throw new Error("An existing return request is already pending approval. Please wait.");
        }

        // 4. Validate Quantity
        const alreadyAccountedFor =
            assignment.clearedQuantity +
            assignment.lostlQuantity +
            assignment.damagedQuantity;

        const remainingQuantity = assignment.quantity - alreadyAccountedFor;

        if (totalToAccountFor > remainingQuantity) {
            throw new Error(
                `Cannot submit. You are trying to return ${totalToAccountFor}, but only ${remainingQuantity} are left.`
            );
        }

        // --- THIS IS THE FIX ---
        // 5. Create the ReturnRequest *FIRST*
        const returnRequest = new ReturnRequest({
            assignmentId,
            cleared,
            shortage,
            seconds,
            submittedBy: jobworkerId // Use jobworkerId from req.body
        });
        await returnRequest.save({ session }); // --- 👆 ADD .session(session)
        // --- END OF FIX ---

        // 6. NOW update the WorkAssignment
        assignment.pendingClearedQuantity = cleared;
        assignment.pendingLostlQuantity = shortage;
        assignment.pendingDamagedQuantity = seconds;
        assignment.activeReturnRequestId = returnRequest._id; // ✅ This now works

        const updatedAssignment = await assignment.save({ session }); // --- 👆 ADD .session(session)

        // 7. Commit the transaction
        // --- 👇 ADD THIS ---
        await session.commitTransaction();
        // --- END ADD ---

        res.status(201).json({
            success: true,
            message: "Return request submitted successfully. Waiting for approval.",
            data: { returnRequest, updatedAssignment } // Send both
        });

    } catch (err) {
        // --- 👇 ADD THIS ---
        await session.abortTransaction(); // Rollback on error
        // --- END ADD ---
        console.error("🔥 Error in submitReturnRequest:", err);
        res.status(400).json({ success: false, message: err.message }); // Use 400 for logic errors
    } finally {
        // --- 👇 ADD THIS ---
        session.endSession(); // Always end the session
        // --- END ADD ---
    }
};

/**
 * @desc    Approve or Reject a return request
 * @route   PUT /api/return-requests/:id/review
 * @access  Private (Super-admin)
 */

exports.reviewReturnRequest = async (req, res) => {
    const { action, rejectionReason, reviewedBy, returnrequestId } = req.body; // action = "approve" or "reject"

    if (!action || !returnrequestId) {
        return res.status(400).json({ success: false, message: "Action and returnrequestId are required." });
    }
    // if (action === 'reject' && !rejectionReason) {
    //     return res.status(400).json({ success: false, message: "rejectionReason is required when rejecting." });
    // }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const returnRequest = await ReturnRequest.findById(returnrequestId).session(session);

        if (!returnRequest) {
            throw new Error("Return request not found.");
        }

        if (returnRequest.status !== 'Pending') {
            throw new Error(`This request has already been ${returnRequest.status}.`);
        }

        const assignment = await WorkAssignment.findById(returnRequest.assignmentId)
            .populate('productId', 'title')
            .populate('jobworker', 'name')
            .session(session);
        if (!assignment) {
            throw new Error("Associated work assignment not found.");
        }

        const productName = assignment.productId ? assignment.productId.title : 'Unknown Product';
        const jobworkerName = assignment.jobworker ? assignment.jobworker.name : 'Unknown Worker';

        if (action === 'reject') {
            returnRequest.status = 'Rejected';
            returnRequest.rejectionReason = rejectionReason || "no reason";
            returnRequest.reviewedBy = reviewedBy;

            // This is the "redo"
            assignment.pendingClearedQuantity = 0;
            assignment.pendingLostlQuantity = 0;
            assignment.pendingDamagedQuantity = 0;
            assignment.activeReturnRequestId = null; // Unlock

            await InventoryLedger.create([{
                log: `RETURN REJECTED: Request to return items for '${productName}' from ${jobworkerName} was rejected. Reason: ${rejectionReason}`,
                performedBy: reviewedBy,
                productId: assignment.productId._id,
                relatedAssignmentId: assignment._id
            }], { session });

        }
        // --- Case 2: APPROVE ---
        else if (action === 'approve') {
            returnRequest.status = 'Approved';
            returnRequest.reviewedBy = reviewedBy;

            const clearedQty = assignment.pendingClearedQuantity;
            const lostQty = assignment.pendingLostlQuantity;
            const damagedQty = assignment.pendingDamagedQuantity;

            // 2a. Update Product stock for CLEARED items
            if (clearedQty > 0) {
                await Product.findByIdAndUpdate(
                    assignment.productId,
                    { $inc: { totalAvailableStock: clearedQty } },
                    { session }
                );
                await InventoryLedger.create([{
                    log: `RETURN CLEARED: ${clearedQty} units of '${productName}' returned by ${jobworkerName}. (Stock added back)`,
                    performedBy: reviewedBy,
                    productId: assignment.productId._id,
                    relatedAssignmentId: assignment._id
                }], { session });
            }

            // 2b. Log LOST items
            if (lostQty > 0) {
                await InventoryLedger.create([{
                    log: `RETURN LOST: ${lostQty} units of '${productName}' reported as LOST by ${jobworkerName}.`,
                    performedBy: reviewedBy,
                    productId: assignment.productId._id,
                    relatedAssignmentId: assignment._id
                }], { session });
            }

            // 2c. Log DAMAGED items
            if (damagedQty > 0) {
                await InventoryLedger.create([{
                    log: `RETURN DAMAGED: ${damagedQty} units of '${productName}' reported as DAMAGED by ${jobworkerName}.`,
                    performedBy: reviewedBy,
                    productId: assignment.productId._id,
                    relatedAssignmentId: assignment._id
                }], { session });
            }
            // --- END "MISSING CODE" ---
            assignment.clearedQuantity += clearedQty;
            assignment.lostlQuantity += lostQty;
            assignment.damagedQuantity += damagedQty;

            // 3. Reset pending values
            assignment.pendingClearedQuantity = 0;
            assignment.pendingLostlQuantity = 0;
            assignment.pendingDamagedQuantity = 0;
            assignment.activeReturnRequestId = null; // Unlock

            // 4. Update assignment status
            const newTotalAccountedFor =
                assignment.clearedQuantity +
                assignment.lostlQuantity +
                assignment.damagedQuantity;

            assignment.status =
                (newTotalAccountedFor === assignment.quantity) ? "Cleared" : "InProgress";

        } else {
            throw new Error("Invalid action.");
        }

        // --- Save everything ---
        await returnRequest.save({ session });
        const updatedAssignment = await assignment.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `Request has been ${returnRequest.status}.`,
            data: updatedAssignment
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("🔥 Error in reviewReturnRequest:", err);
        const statusCode = err.message.includes("not found") ? 404 : (err.message.includes("failed") ? 400 : 500);
        res.status(statusCode).json({ success: false, message: err.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Directly process a return (Bypasses approval)
 * @route   POST /api/return-requests/direct-process
 * @access  Private (Super-admin ONLY)
 */
exports.directReturnProcess = async (req, res) => {
    const {
        assignmentId,
        cleared = 0,
        shortage = 0,
        seconds = 0
    } = req.body;

    // This is the ID of the super-admin making the direct action
    const superAdminId = req.user.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!assignmentId) throw new Error("assignmentId is required.");

        const totalToAccountFor = cleared + shortage + seconds;
        if (totalToAccountFor <= 0) {
            throw new Error("You must provide a quantity greater than zero.");
        }

        const assignment = await WorkAssignment.findById(assignmentId).session(session);
        if (!assignment) throw new Error("Work assignment not found.");

        // --- Validation ---
        // Find all *pending* requests to calculate the real remaining quantity
        const pendingRequests = await ReturnRequest.find({
            assignmentId: assignmentId,
            status: 'Pending'
        }).session(session); // Add session here

        const pendingQuantity = pendingRequests.reduce((acc, req) => {
            return acc + req.cleared + req.shortage + req.seconds;
        }, 0);

        const alreadyAccountedFor =
            assignment.clearedQuantity +
            assignment.lostlQuantity +
            assignment.damagedQuantity;

        // This is the true remaining quantity
        const remainingQuantity = assignment.quantity - alreadyAccountedFor - pendingQuantity;

        if (totalToAccountFor > remainingQuantity) {
            throw new Error(
                `Cannot process. You are trying to account for ${totalToAccountFor}, but only ${remainingQuantity} are available (after ${pendingQuantity} items pending approval).`
            );
        }

        // --- 1. Update the WorkAssignment (like your old code) ---
        assignment.clearedQuantity += cleared;
        assignment.lostlQuantity += shortage;
        assignment.damagedQuantity += seconds;

        const newTotalAccountedFor =
            assignment.clearedQuantity +
            assignment.lostlQuantity +
            assignment.damagedQuantity;

        assignment.status =
            newTotalAccountedFor === assignment.quantity ? "Cleared" : "InProgress";

        const updatedAssignment = await assignment.save({ session });

        // --- 👇 ADD THIS NEW LEDGER LOGIC ---

        // 1. If stock is CLEARED, add it back to the main Product stock
        if (cleared > 0) {
            await Product.findByIdAndUpdate(
                assignment.productId,
                { $inc: { totalAvailableStock: cleared } },
                { session }
            );
            await InventoryLedger.create([{
                productId: assignment.productId,
                type: 'RETURN_CLEARED',
                quantityChange: cleared, // Positive
                performedBy: reviewedBy,
                relatedAssignmentId: assignment._id,
                relatedReturnId: returnRequest._id
            }], { session });
        }

        // 2. If stock is LOST, just log it (stock is already out)
        if (shortage > 0) {
            await InventoryLedger.create([{
                productId: assignment.productId,
                type: 'RETURN_LOST',
                quantityChange: 0, // No change to main stock
                performedBy: reviewedBy,
                relatedAssignmentId: assignment._id,
                relatedReturnId: returnRequest._id
            }], { session });
        }

        // 3. If stock is DAMAGED, just log it (stock is already out)
        if (seconds > 0) {
            await InventoryLedger.create([{
                productId: assignment.productId,
                type: 'RETURN_DAMAGED',
                quantityChange: 0, // No change to main stock
                performedBy: reviewedBy,
                relatedAssignmentId: assignment._id,
                relatedReturnId: returnRequest._id
            }], { session });
        }
        // --- END OF NEW LOGIC ---

        // --- 2. Create an auto-approved ReturnRequest (for history) ---
        // We create this so your records are consistent
        await ReturnRequest.create([{
            assignmentId,
            cleared,
            shortage,
            seconds,
            status: 'Approved', // Mark as approved immediately
            submittedBy: superAdminId,
            reviewedBy: superAdminId  // Approved by the same admin
        }], { session }); // Pass the session here

        // --- 3. Commit all changes ---
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `Successfully processed direct return. Status is now ${updatedAssignment.status}.`,
            data: updatedAssignment,
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("🔥 Error in directReturnProcess:", err);
        const statusCode =
            err.message.includes("Cannot process") || err.message.includes("required")
                ? 400
                : (err.message.includes("not found") ? 404 : 500);
        res.status(statusCode).json({ success: false, message: err.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get all pending return requests
 * @route   GET /api/return-requests/pending
 * @access  Private (Super-admin ONLY)
 */
exports.getPendingReturnRequests = async (req, res) => {
    try {
        const pendingRequests = await ReturnRequest.find({ status: 'Pending' })
            .populate({
                path: 'assignmentId',
                select: 'productId jobworker quantity', // Select what fields you want to show
                populate: [
                    { path: 'productId', select: 'name' }, // Show product name
                    { path: 'jobworker', select: 'name' }  // Show jobworker name
                ]
            })
            .populate('submittedBy', 'name email') // Show who submitted it
            .sort({ createdAt: 1 }); // Show oldest requests first

        res.status(200).json({
            success: true,
            count: pendingRequests.length,
            data: pendingRequests
        });

    } catch (err) {
        console.error("🔥 Error in getPendingReturnRequests:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get all return requests submitted by the logged-in user
 * @route   GET /api/inventory/my-requests
 * @access  Private (Jobworker/Admin)
 */
exports.getMyReturnRequests = async (req, res) => {
    try {
        const { jobworkerId } = req.body; // From auth middleware

        // Find all requests submitted by this user
        const requests = await ReturnRequest.find({ submittedBy: jobworkerId })
            .populate({
                path: 'assignmentId',
                select: 'productId challanId quantity', // Show what product/challan it was
                populate: {
                    path: 'productId',
                    select: 'title sku image' // Get product details
                }
            })
            .populate('reviewedBy', 'name') // Show who approved/rejected it
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });

    } catch (err) {
        console.error("🔥 Error in getMyReturnRequests:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
};
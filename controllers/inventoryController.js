const Inventory = require("../model/inventory");
const WorkAssignment = require('../model/WorkAssignment');
const Product = require("../model/product");
const Challan = require("../model/Challan");
const InventoryLedger = require('../model/InventoryLedger');
const JobWorker = require("../model/jobworker")
const mongoose = require("mongoose");

// exports.createInventory = async (req, res) => {
//     let session;

//     try {
//         const session = await mongoose.startSession();
//         session.startTransaction();
//         console.log("🔄 [createInventory] Incoming request body:", JSON.stringify(req.body, null, 2));
//         const { products, vendor, issuedBy, firm, notes, challanNo, challanDate } = req.body;

//         // Validation logs
//         if (!products || !Array.isArray(products) || products.length === 0) {
//             console.warn("⚠️ [createInventory] Validation failed: No products provided");
//             return res.status(400).json({
//                 success: false,
//                 message: "At least one product with quantity is required."
//             });
//         }

//         if (!issuedBy) {
//             console.warn("⚠️ [createInventory] Validation failed: issuedBy is missing");
//             return res.status(400).json({
//                 success: false,
//                 message: "issuedBy is required."
//             });
//         }

//         // ✅ Normalize products
//         const normalizedProducts = products.map((p, idx) => {
//             console.log(`🔧 [createInventory] Processing product[${idx}] → id: ${p.product}, qty: ${p.quantity}, discount: ${p.discount || 0}`);
//             return {
//                 product: p.product,
//                 price: p.price || 0,
//                 quantity: p.quantity,
//                 availableStock: p.quantity,   // Initialize available stock
//                 discount: p.discount || 0
//             };
//         });
//         console.log(normalizedProducts, 'normalizedProducts')

//         const newBatch = new Inventory({
//             products: normalizedProducts,
//             vendor,
//             issuedBy,
//             firm,
//             notes,
//             challanNo,
//             challanDate
//         });

//         await newBatch.save({ session });

//         // 👇 **NEW LOGIC: UPDATE CENTRAL PRODUCT STOCK**
//         for (const p of normalizedProducts) {
//             await Product.findByIdAndUpdate(
//                 p.product,
//                 { $inc: { totalAvailableStock: p.quantity } }, // Use $inc to safely add quantity
//                 { session }
//             );

//             await InventoryLedger.create([{
//                 productId: p.product,
//                 type: 'STOCK_IN',
//                 quantityChange: p.quantity, // Positive number
//                 performedBy: issuedBy, // The user who issued the inventory
//                 relatedChallanId: newBatch.challanNo // You can link the challan
//             }], { session });

//             console.log(`✅ [createInventory] Inventory batch saved successfully...`);
//         }

//         console.log(`✅ [createInventory] Inventory batch saved successfully → _id: ${newBatch._id}, totalProducts: ${products.length}`);
//         await session.commitTransaction();

//         res.status(201).json({
//             success: true,
//             message: "Inventory batch created and stock updated successfully.",
//             data: newBatch
//         });

//     } catch (err) {
//         await session.abortTransaction();
//         console.log("🔥 [createInventory] Error:", err);
//         res.status(500).json({ success: false, message: "Server error.", error: err.message });
//     } finally {
//         session.endSession();
//     }
// };

exports.createInventory = async (req, res) => {
    let session; // <-- define outside try block
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        console.log("🔄 [createInventory] Incoming request body:", JSON.stringify(req.body, null, 2));
        const { products, vendor, issuedBy, firm, notes, challanNo, challanDate } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            console.warn("⚠️ [createInventory] Validation failed: No products provided");
            return res.status(400).json({
                success: false,
                message: "At least one product with quantity is required."
            });
        }

        if (!issuedBy) {
            console.warn("⚠️ [createInventory] Validation failed: issuedBy is missing");
            return res.status(400).json({
                success: false,
                message: "issuedBy is required."
            });
        }

        // ✅ Normalize products
        const normalizedProducts = products.map((p, idx) => {
            console.log(`🔧 [createInventory] Processing product[${idx}] → id: ${p.product}, qty: ${p.quantity}, discount: ${p.discount || 0}`);
            return {
                product: p.product,
                price: p.price || 0,
                quantity: p.quantity,
                availableStock: p.quantity,
                discount: p.discount || 0
            };
        });

        console.log(normalizedProducts, 'normalizedProducts');

        const newBatch = new Inventory({
            products: normalizedProducts,
            vendor,
            issuedBy,
            firm,
            notes,
            challanNo,
            challanDate
        });

        await newBatch.save({ session });

        // 👇 Update product stocks
        for (const p of normalizedProducts) {
            await Product.findByIdAndUpdate(
                p.product,
                { $inc: { totalAvailableStock: p.quantity } },
                { session }
            );

            const product = await Product.findById(p.product).select('title').session(session);
            const productName = product ? product.title : p.product;

            await InventoryLedger.create([{
                log: `STOCK IN: ${p.quantity} units of '${productName}' added to inventory. (Challan: ${challanNo})`,
                performedBy: issuedBy,
                productId: p.product,
                relatedChallanId: newBatch._id
            }], { session });
        }

        await session.commitTransaction();
        console.log(`✅ [createInventory] Inventory batch saved successfully → _id: ${newBatch._id}`);

        res.status(201).json({
            success: true,
            message: "Inventory batch created and stock updated successfully.",
            data: newBatch
        });

    } catch (err) {
        if (session) await session.abortTransaction(); // safe check
        console.log("🔥 [createInventory] Error:", err);
        res.status(500).json({ success: false, message: "Server error.", error: err.message });
    } finally {
        if (session) session.endSession(); // safe check
    }
};

async function getNextChallanNumber() {
    const lastChallan = await Challan.findOne().sort({ createdAt: -1 });
    if (!lastChallan) {
        return "CH-00001";
    }
    const lastNum = parseInt(lastChallan.challanNo.split('-')[1]);
    const nextNum = (lastNum + 1).toString().padStart(5, '0');
    return `CH-${nextNum}`;
}

exports.assignToWorkers = async (req, res) => {
    // 1. Destructure additionalItems from the request body
    const { jobworkerId, assignedBy, notes, productsToAssign, additionalItems } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const jobworker = await JobWorker.findById(jobworkerId).select('name').session(session);
        const jobworkerName = jobworker ? jobworker.name : jobworkerId;

        // 2. Combine both arrays into one. Use '|| []' as a fallback if one is missing.
        const allItemsToAssign = [...(productsToAssign || []), ...(additionalItems || [])];

        // 3. Update validation to check the combined array
        if (!jobworkerId || allItemsToAssign.length === 0) {
            throw new Error("jobworkerId and at least one product/item to assign are required.");
        }

        const newChallan = new Challan({
            challanNo: await getNextChallanNumber(),
            jobworker: jobworkerId,
            dispatchedBy: assignedBy,
            notes: notes,
            assignments: []
        });
        await newChallan.save({ session });

        const createdAssignments = [];
        const assignmentIds = [];
        const inventoryUpdateOps = [];

        // 4. Loop over the combined 'allItemsToAssign' array
        for (const product of allItemsToAssign) {
            const { productId, quantity: quantityToAssign, price } = product;

            // Find the product document
            const productDoc = await Product.findById(productId).session(session);
            if (!productDoc || productDoc.totalAvailableStock < quantityToAssign) {
                throw new Error(`Not enough stock for product ${productDoc?.name || productId}. Available: ${productDoc?.totalAvailableStock}, Required: ${quantityToAssign}`);
            }

            // Find inventory batches
            const inventoryBatches = await Inventory.find({
                "products.product": productId,
                "products.availableStock": { $gt: 0 }
            }).sort({ challanDate: 1 }).session(session);

            let remainingToAssign = quantityToAssign;
            const sourceBatches = [];

            for (const batch of inventoryBatches) {
                if (remainingToAssign <= 0) break;
                const productInBatch = batch.products.find(p => p.product.toString() === productId);

                if (productInBatch && productInBatch.availableStock > 0) {
                    const takeFromThisBatch = Math.min(remainingToAssign, productInBatch.availableStock);
                    const newStockLevel = productInBatch.availableStock - takeFromThisBatch;
                    remainingToAssign -= takeFromThisBatch;

                    sourceBatches.push({
                        inventoryId: batch._id,
                        quantityTaken: takeFromThisBatch
                    });

                    inventoryUpdateOps.push({
                        updateOne: {
                            filter: { "_id": batch._id, "products.product": productId },
                            update: { "$set": { "products.$.availableStock": newStockLevel } }
                        }
                    });
                }
            }

            // Update product stock and save
            productDoc.totalAvailableStock -= quantityToAssign;
            await productDoc.save({ session });

            // --- 👇 ADD THIS ---
            await InventoryLedger.create([{
                log: `ASSIGNMENT OUT: ${quantityToAssign} units of '${productDoc.title}' assigned to ${jobworkerName}. (Challan: ${newChallan.challanNo})`,
                performedBy: assignedBy,
                productId: productDoc._id,
                relatedChallanId: newChallan._id
            }], { session });
            // --- END OF NEW CODE ---

            // Create the work assignment
            const assignment = new WorkAssignment({
                productId,
                quantity: quantityToAssign,
                price: price || 0,
                jobworker: jobworkerId,
                assignedBy,
                challanId: newChallan._id,
                sourceBatches: sourceBatches,
                status: "Pending",
                issueDetails: notes
            });

            const savedAssignment = await assignment.save({ session });
            createdAssignments.push(savedAssignment);
            assignmentIds.push(savedAssignment._id);
        }

        // Execute all inventory updates
        if (inventoryUpdateOps.length > 0) {
            await Inventory.bulkWrite(inventoryUpdateOps, { session });
        }

        // Update challan with all assignment IDs
        newChallan.assignments = assignmentIds;
        await newChallan.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: `Challan ${newChallan.challanNo} created and items assigned successfully.`,
            data: { challan: newChallan, assignments: createdAssignments }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("🔥 Error assigning work:", err);
        res.status(400).json({ success: false, message: err.message });
    } finally {
        session.endSession();
    }
};

exports.getProductStockSummary = async (req, res) => {
    try {
        // Fetch all products with their total available stock
        const stockSummary = await Product.find({})
            .select("name sku totalAvailableStock") // Select only the fields you need
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: "Product stock summary fetched successfully.",
            data: stockSummary
        });
    } catch (err) {
        console.error("🔥 Error fetching product stock summary:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

exports.getInventories = async (req, res) => {

    try {
        const { userId } = req.body;
        console.log("📥 Incoming Request Body:", req.body);

        if (!userId) {
            console.warn("⚠️ No userId provided in request body");
            return res.status(400).json({
                success: false,
                message: "userId is required in request body"
            });
        }

        console.log(`🔍 Fetching inventories issued by userId: ${userId} ...`);

        const inventories = await Inventory.find({ issuedBy: userId })
            .populate("products.product", "name sku")
            .populate("vendor", "name")
            .populate("issuedBy", "name email")
            .populate("firm", "name")
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${inventories.length} inventories for userId: ${userId}`);

        res.json({
            success: true,
            count: inventories.length,
            data: inventories
        });

    } catch (err) {
        console.error("🔥 Error in getInventories:", err.message);
        res.status(500).json({
            success: false,
            message: "Error fetching inventories",
            error: err.message
        });
    }
};

exports.getAssignments = async (req, res) => {
    try {
        const { inventoryId } = req.body;
        console.log("📋 Fetching assignments for inventory:", req.body);

        const assignments = await WorkAssignment.find({ InventoryId: inventoryId })
            .populate("InventoryId", "product quantity")
            .populate("jobworker", "name phone")
            // .populate("employee", "name email")
            .populate("assignedBy", "name")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: assignments.length,
            data: assignments
        });

    } catch (err) {
        console.log("🔥 Error fetching assignments:", err.message);
        res.status(500).json({
            success: false,
            message: "Error fetching assignments",
            error: err.message
        });
    }
};

exports.deleteInventory = async (req, res) => {
    console.log("🗑 Received request to delete inventory log...");

    try {
        const { id } = req.body;

        // 🛑 Validate ID
        if (!id) {
            console.error("❌ No inventory log ID provided");
            return res.status(400).json({
                success: false,
                message: "Inventory log ID is required."
            });
        }

        // 🚮 Attempt delete
        const deletedLog = await Inventory.findByIdAndDelete(id);

        if (!deletedLog) {
            console.warn(`⚠️ Inventory log not found for ID: ${id}`);
            return res.status(404).json({
                success: false,
                message: "Inventory log not found."
            });
        }

        console.log(`✅ Inventory log deleted successfully: ${deletedLog._id}`);

        res.json({
            success: true,
            message: "Inventory log deleted successfully.",
            deletedId: deletedLog._id
        });

    } catch (error) {
        console.error(`🔥 Error deleting inventory log (ID: ${req.params.id}):`, error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting inventory log.",
            error: error.message
        });
    }
};

exports.getInventoryById = async (req, res) => {
    try {
        const { id } = req.body;

        const inventory = await InventoryLog.findById(id)
            .populate('product')
            .populate('employee')
            .populate('jobworker')
            .populate('vendor')
            .populate('firm');

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory log not found."
            });
        }

        res.json({
            success: true,
            message: "Inventory log fetched successfully.",
            data: inventory
        });
    } catch (error) {
        console.error("🔥 Error fetching inventory log:", error.message);
        res.status(500).json({
            success: false,
            message: "Server error while fetching inventory log.",
            error: error.message
        });
    }
};

exports.updateInventory = async (req, res) => {
    console.log("🔄 Received request to update inventory log...");

    try {
        const { id, ...updateData } = req.body;

        // 🛑 Check if ID is provided
        if (!id) {
            console.error("❌ No ID provided in request");
            return res.status(400).json({
                success: false,
                message: "Inventory log ID is required."
            });
        }

        // ✏️ Attempt update
        const updatedLog = await Inventory.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedLog) {
            console.warn(`⚠️ Inventory log not found for ID: ${id}`);
            return res.status(404).json({
                success: false,
                message: "Inventory log not found."
            });
        }

        console.log(`✅ Inventory log updated: ${updatedLog._id}`);

        res.json({
            success: true,
            message: "Inventory log updated successfully.",
            data: updatedLog
        });

    } catch (error) {
        console.error("🔥 Error updating inventory log:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating inventory log.",
            error: error.message
        });
    }
};

exports.getAssignmentsByJobWorker = async (req, res) => {
    try {
        console.log("🚚 Fetching all challans and grouping by job worker...");

        // 👇 Key change: We now query the Challan model as our starting point.
        const allChallans = await Challan.find({})
            .populate('jobworker', 'name phone')
            .populate({
                path: 'assignments',
                populate: {
                    path: 'productId',
                    select: 'title sku image' // Select only the product fields you need
                }
            })
            .sort({ challanDate: -1 }) // Show most recent challans first
            .lean();

        if (!allChallans || allChallans.length === 0) {
            return res.status(200).json({ success: true, message: "No assignments found.", data: [] });
        }

        // 2. Group the fetched challans by job worker
        const groupedByJobWorker = allChallans.reduce((acc, challan) => {
            // Skip any challans that might have a missing jobworker reference
            if (!challan.jobworker) {
                return acc;
            }

            const jwId = challan.jobworker._id.toString();

            // If this is the first time we see this job worker, initialize their entry
            if (!acc[jwId]) {
                acc[jwId] = {
                    jobworker: challan.jobworker,
                    challans: [] // We will now have an array of challans
                };
            }

            // Add the entire challan (which now contains its assignments) to the list
            acc[jwId].challans.push(challan);

            return acc;
        }, {});

        // 3. Convert the grouped object into an array for the final response
        const finalData = Object.values(groupedByJobWorker);
        console.log(`✅ Grouped assignments by ${finalData.length} job workers.`);

        res.set('Cache-Control', 'no-store');

        res.status(200).json({
            success: true,
            count: finalData.length,
            data: finalData
        });

    } catch (err) {
        console.log("🔥 Error fetching assignments by job worker:", err);
        res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
};

// exports.receiveAssignmentReturn = async (req, res) => {
//     const { assignmentId, cleared = 0, shortage = 0, seconds = 0 } = req.body;
//     console.log("🔄 [receiveAssignmentReturn] Incoming request body:", JSON.stringify(req.body, null, 2));

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         if (!assignmentId) throw new Error("assignmentId is required.");

//         const totalToAccountFor = cleared + shortage + seconds;
//         if (totalToAccountFor <= 0) {
//             throw new Error("You must provide a quantity greater than zero.");
//         }

//         const assignment = await WorkAssignment.findById(assignmentId).session(session);
//         if (!assignment) throw new Error("Work assignment not found.");

//         // 📊 Before update log
//         console.log("📊 BEFORE UPDATE:", {
//             assignmentId: assignment._id.toString(),
//             totalStock: assignment.quantity,
//             cleared: assignment.clearedQuantity,
//             shortage: assignment.lostlQuantity,
//             seconds: assignment.damagedQuantity,
//         });

//         const alreadyAccountedFor =
//             assignment.clearedQuantity +
//             assignment.lostlQuantity +
//             assignment.damagedQuantity;

//         const remainingQuantity = assignment.quantity - alreadyAccountedFor;
//         console.log(`🔎 Remaining quantity before update: ${remainingQuantity}`);

//         if (totalToAccountFor > remainingQuantity) {
//             throw new Error(
//                 `Cannot process. You are trying to account for ${totalToAccountFor} items, but only ${remainingQuantity} are left.`
//             );
//         }

//         // ✅ Correct field mappings
//         assignment.clearedQuantity += cleared;
//         assignment.lostlQuantity += shortage;
//         assignment.damagedQuantity += seconds;

//         const newTotalAccountedFor =
//             assignment.clearedQuantity +
//             assignment.lostlQuantity +
//             assignment.damagedQuantity;

//         assignment.status =
//             newTotalAccountedFor === assignment.quantity ? "Cleared" : "InProgress";

//         const updatedAssignment = await assignment.save({ session });

//         // 📊 After update log
//         console.log("📊 AFTER UPDATE:", {
//             assignmentId: updatedAssignment._id.toString(),
//             totalStock: updatedAssignment.quantity,
//             cleared: updatedAssignment.clearedQuantity,
//             shortage: updatedAssignment.lostlQuantity,
//             seconds: updatedAssignment.damagedQuantity,
//             remaining: updatedAssignment.quantity - newTotalAccountedFor,
//             status: updatedAssignment.status,
//         });

//         await session.commitTransaction();

//         console.log("✅ Final Saved Response:", updatedAssignment.toObject());

//         res.status(200).json({
//             success: true,
//             message: `Successfully processed return for assignment. Status is now ${updatedAssignment.status}.`,
//             data: updatedAssignment,
//         });
//     } catch (err) {
//         await session.abortTransaction();
//         console.error("🔥 Error in receiveAssignmentReturn:", err);
//         const statusCode =
//             err.message.includes("Cannot process") || err.message.includes("required")
//                 ? 400
//                 : 500;
//         res.status(statusCode).json({ success: false, message: err.message });
//     } finally {
//         session.endSession();
//     }
// };


// ... (your other controller functions)

/**
 * @desc    Get the inventory history (audit log) for a single product
 * @route   GET /api/inventory-history/:productId
 * @access  Private (Admin)
 */
exports.getInventoryHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const logs = await InventoryLedger.find({}).select('log createdAt')

        // const totalDocuments = await InventoryLedger.countDocuments({});

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });

    } catch (err) {
        console.error("🔥 Error in getInventoryHistory:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
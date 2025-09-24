const Inventory = require("../model/inventory");
const WorkAssignment = require('../model/WorkAssignment');
const mongoose = require("mongoose");

exports.createInventory = async (req, res) => {
    try {
        console.log("🔄 [createInventory] Incoming request body:", JSON.stringify(req.body, null, 2));

        const { products, vendor, issuedBy, firm, notes, challanNo, challanDate } = req.body;

        // Validation logs
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
                quantity: p.quantity,
                availableStock: p.quantity,   // Initialize available stock
                discount: p.discount || 0
            };
        });
        console.log(normalizedProducts, 'normalizedProducts')

        // ✅ Create new batch
        const newBatch = new Inventory({
            products: normalizedProducts,
            vendor,
            issuedBy,
            firm,
            notes,
            challanNo,
            challanDate
        });

        console.log("📝 [createInventory] New Inventory object created, saving to DB...");

        await newBatch.save();
        console.log(`✅ [createInventory] Inventory batch saved successfully → _id: ${newBatch._id}, totalProducts: ${products.length}`);

        res.status(201).json({
            success: true,
            message: "Inventory batch created successfully.",
            data: newBatch
        });

    } catch (err) {
        console.error("🔥 [createInventory] Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error while creating inventory batch.",
            error: err.message
        });
    }
};

exports.assignToWorkers = async (req, res) => {
    try {
        const { inventoryId, workers, assignedBy, issueDetails } = req.body;
        console.log(req.body, 'req.body')

        if (!inventoryId || !workers || !Array.isArray(workers) || workers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "inventoryId and at least one worker with quantity are required."
            });
        }

        // ✅ Fetch inventory batch
        const batch = await Inventory.findById(inventoryId);
        if (!batch) {
            console.log("inventoryId batch not found.", inventoryId);
            return res.status(404).json({ success: false, message: "inventoryId batch not found." });
        }

        console.log("==== INVENTORY BATCH LOG START ====");
        console.log(JSON.stringify(batch, null, 2));
        console.log("==== INVENTORY BATCH LOG END ====");

        const createdAssignments = [];

        // ✅ Iterate over workers and update correct product stock
        for (const w of workers) {
            const productInBatch = batch.products.find(
                p => p.product.toString() === w.productId
            );

            if (!productInBatch) {
                console.log(`Product ${w.productId} not found in this inventory batch`)
                return res.status(400).json({
                    success: false,
                    message: `Product ${w.productId} not found in this inventory batch`
                });
            }

            // ✅ Check stock for this product
            if (productInBatch.availableStock < w.quantity) {
                console.log(
                    `Not enough stock for product ${w.productId}. Available: ${productInBatch.availableStock}, Needed: ${w.quantity}`
                );
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for product ${w.productId}. Available: ${productInBatch.availableStock}, Needed: ${w.quantity}`
                });
            }

            // ✅ Deduct stock
            productInBatch.availableStock -= w.quantity;

            // ✅ Create assignment record
            const assignment = new WorkAssignment({
                InventoryId: inventoryId,
                productId: w.productId,
                jobworker: w.jobworker || null,
                quantity: w.quantity,
                availableQty: productInBatch.availableStock,   // <-- add this line
                assignedBy,
                issueDetails,
                status: "Pending"
            });

            await assignment.save();
            createdAssignments.push(assignment);
        }

        // ✅ Save updated inventory after processing all workers
        await batch.save();

        console.log(`📤 Assigned from Batch:${inventoryId} → ${workers.length} workers`);

        res.status(201).json({
            success: true,
            message: "Inventory assigned successfully.",
            data: createdAssignments
        });

    } catch (err) {
        console.error("🔥 Error assigning inventory:", err);
        res.status(500).json({
            success: false,
            message: "Server error while assigning inventory.",
            error: err.message
        });
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
        const deletedLog = await InventoryLog.findByIdAndDelete(id);

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
        const updatedLog = await InventoryLog.findByIdAndUpdate(
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

exports.updateWorkAssignmentStatus = async (req, res) => {
    try {
        const { assignmentId, status } = req.body;

        if (!assignmentId || !status) {
            console.log('assignmentId and status are required.')
            return res.status(400).json({
                success: false,
                message: "assignmentId and status are required."
            });
        }

        const updatedAssignment = await WorkAssignment.findByIdAndUpdate(
            assignmentId,
            { $set: { status } },
            { new: true, runValidators: true }
        );

        if (!updatedAssignment) {
            console.log('Work assignment not found.')
            return res.status(404).json({
                success: false,
                message: "Work assignment not found."
            });
        }

        res.json({
            success: true,
            message: "Work assignment status updated successfully.",
            data: updatedAssignment
        });
    } catch (err) {
        console.log("🔥 Error updating work assignment status:", err);
        res.status(500).json({
            success: false,
            message: "Server error while updating work assignment status.",
            error: err.message
        });
    }
};

exports.clearAssignmentQuantity = async (req, res) => {
    try {
        const { assignmentId, quantityToClear } = req.body;

        // 1. Validation
        if (!assignmentId || !quantityToClear) {
            return res.status(400).json({ message: "assignmentId and quantityToClear are required." });
        }

        if (typeof quantityToClear !== 'number' || quantityToClear <= 0) {
            return res.status(400).json({ message: "quantityToClear must be a positive number." });
        }

        // 2. Find the assignment
        const assignment = await WorkAssignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Work assignment not found." });
        }

        // 3. Check if trying to clear more than what's remaining
        const remainingQuantity = assignment.quantity - assignment.clearedQuantity;
        if (quantityToClear > remainingQuantity) {
            return res.status(400).json({
                message: `Cannot clear ${quantityToClear}. Only ${remainingQuantity} remaining to be cleared.`,
                remainingQuantity: remainingQuantity
            });
        }

        // 4. Update the cleared quantity
        assignment.clearedQuantity += quantityToClear;

        // 5. Update the status automatically based on the new cleared quantity
        if (assignment.clearedQuantity === assignment.quantity) {
            assignment.status = 'Cleared';
        } else if (assignment.clearedQuantity > 0) {
            assignment.status = 'InProgress';
        }

        // 6. Save the changes
        await assignment.save();
        console.log(`✅ Cleared ${quantityToClear} for assignment ${assignmentId}. New total cleared: ${assignment.clearedQuantity}`);

        res.status(200).json({
            success: true,
            message: `Successfully cleared ${quantityToClear} units.`,
            data: assignment
        });

    } catch (err) {
        console.error("🔥 Error in clearAssignmentQuantity:", err);
        res.status(500).json({ message: "Server error while clearing assignment quantity.", error: err.message });
    }
};

exports.getInventoriesByJW = async (req, res) => {
    try {
        console.log("📦 Fetching inventories...");

        const inventories = await Inventory.find()
            .populate("vendor", "name")
            .populate("issuedBy", "name email")
            .populate("firm", "name")
            .sort({ createdAt: -1 })
            .lean();

        console.log("✅ Inventories found:", inventories.length);

        const inventoryIds = inventories.map(inv => inv._id);
        console.log("🆔 Inventory IDs:", inventoryIds);

        console.log("🔎 Fetching work assignments for inventories...");
        const assignments = await WorkAssignment.find({
            InventoryId: { $in: inventoryIds }
        })
            .populate("productId", "name sku")
            .populate("jobworker", "name phone")
            .lean();

        console.log("✅ WorkAssignments found:", assignments);

        const groupedAssignments = {};
        assignments.forEach(a => {
            console.log(`📌 Processing assignment: ${a._id} for Inventory: ${a.InventoryId}`);

            if (!groupedAssignments[a.InventoryId]) {
                groupedAssignments[a.InventoryId] = {};
            }

            const jobworkerId = a.jobworker?._id?.toString() || "unassigned";
            if (!groupedAssignments[a.InventoryId][jobworkerId]) {
                groupedAssignments[a.InventoryId][jobworkerId] = {
                    jobworker: a.jobworker || null,
                    products: []
                };
            }

            groupedAssignments[a.InventoryId][jobworkerId].products.push({
                assignmentId: a._id, // 👈 WorkAssignment ID
                product: a.productId,
                clearedQuantity: a.clearedQuantity,
                quantity: a.quantity,
                issueDetails: a.issueDetails,
                status: a.status
            });

            console.log(`➡️ Added product ${a.productId?.name} (qty: ${a.quantity}), cleared Qty : ${a.clearedQuantity} to jobworker ${jobworkerId}`);
        });

        const finalData = inventories.map(inv => {
            console.log(`🧾 Preparing final data for challan ${inv.challanNo}`);
            return {
                challanNo: inv.challanNo,
                challanDate: inv.challanDate,
                jobworkers: Object.values(groupedAssignments[inv._id] || {})
            };
        });

        console.log("🎉 Final response prepared. Count:", finalData.length);

        // 👇 Full expanded log of the response
        console.dir(finalData, { depth: null });

        res.json({
            success: true,
            count: finalData.length,
            data: finalData
        });

    } catch (err) {
        console.error("🔥 Error fetching inventories:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching inventories",
            error: err.message
        });
    }
};


const SaleOrder = require('../model/saleOrder');
const Inventory = require('../model/inventory')
const WorkAssignment = require('../model/WorkAssignment')
const mongoose = require('mongoose')

exports.createSaleOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { products, vendor, admin, firm, invoiceNo, invoiceDate, notes } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product with quantity is required."
            });
        }

        // ✅ Format products for SaleOrder schema
        const formattedProducts = products.map(p => ({
            product: p.productId,
            quantity: p.quantity,
            price: p.price,
            discount: p.discount
        }));

        // ✅ Validate and deduct stock
        for (const item of products) {
            const clearedAssignments = await WorkAssignment.find({
                productId: item.productId,
                status: "Cleared"
            }).populate("InventoryId").session(session);

            if (!clearedAssignments || clearedAssignments.length === 0) {
                throw new Error(`No cleared stock available for product ${item.productId}`);
            }

            const totalCleared = clearedAssignments.reduce((sum, wa) => sum + wa.quantity, 0);

            if (totalCleared < item.quantity) {
                throw new Error(`Not enough cleared stock for product ${item.productId}. Available: ${totalCleared}, Required: ${item.quantity}`);
            }

            let remainingToDeduct = item.quantity;

            for (const wa of clearedAssignments) {
                const inventory = await Inventory.findById(wa.InventoryId._id).session(session);
                if (!inventory) continue;

                const invProduct = inventory.products.find(p => p.product.toString() === item.productId);
                if (!invProduct) continue;

                const deductQty = Math.min(invProduct.availableStock, remainingToDeduct);
                if (deductQty > 0) {
                    invProduct.availableStock -= deductQty;
                    remainingToDeduct -= deductQty;
                    await inventory.save({ session });
                }

                if (remainingToDeduct <= 0) break;
            }
        }

        // ✅ Create SalesOrder
        const saleOrder = new SaleOrder({
            products: formattedProducts,
            vendor,
            admin,
            firm,
            invoiceNo,
            invoiceDate,
            notes
        });

        await saleOrder.save({ session });

        // ✅ Commit transaction
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Sales Order created successfully (via cleared WorkAssignments).",
            data: saleOrder
        });

    } catch (err) {
        // ❌ Rollback changes
        await session.abortTransaction();
        session.endSession();

        console.error("🔥 Error creating sales order v2:", err);
        res.status(500).json({
            success: false,
            message: "Server error while creating Sales Order.",
            error: err.message
        });
    }
};

// ✅ Get all Sales Orders
exports.getSalesOrders = async (req, res) => {
    try {
        console.log("📦 Fetching all sales orders...");

        const salesOrders = await SaleOrder.find()
            .populate("vendor", "name email phone")
            .populate("admin", "name email")
            .populate("firm", "name")
            .populate("products.product", "name sku")
            .sort({ createdAt: -1 })
            .lean();

        console.log("✅ Sales Orders fetched:", salesOrders.length);

        res.status(200).json({
            success: true,
            count: salesOrders.length,
            data: salesOrders
        });
    } catch (err) {
        console.error("🔥 Error fetching sales orders:", err);
        res.status(500).json({
            success: false,
            message: "Server error while fetching Sales Orders.",
            error: err.message
        });
    }
};

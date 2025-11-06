const SaleOrder = require('../model/saleOrder');
const Inventory = require('../model/inventory')
const WorkAssignment = require('../model/WorkAssignment')
const Product = require('../model/product');
const mongoose = require('mongoose');

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
            discount: p.discount || 0
        }));

        // ✅ Validate cleared stock and update global product stock
        for (const item of products) {
            const clearedAssignments = await WorkAssignment.find({
                productId: item.productId,
                status: "Cleared"
            }).session(session);

            if (!clearedAssignments.length) {
                throw new Error(`No cleared stock found for product ${item.productId}`);
            }

            // Calculate total cleared quantity available
            const totalCleared = clearedAssignments.reduce((sum, wa) => sum + wa.quantity, 0);

            if (totalCleared < item.quantity) {
                throw new Error(
                    `Not enough cleared stock for product ${item.productId}. Available: ${totalCleared}, Required: ${item.quantity}`
                );
            }

            // ✅ Deduct quantity from the cleared assignments sequentially
            let remaining = item.quantity;
            for (const wa of clearedAssignments) {
                const deduct = Math.min(wa.quantity, remaining);
                wa.quantity -= deduct;
                remaining -= deduct;

                // If all required quantity deducted, stop
                if (remaining <= 0) break;

                await wa.save({ session });
            }

            // ✅ Update product’s totalAvailableStock
            const product = await Product.findById(item.productId).session(session);
            if (!product) throw new Error(`Product not found: ${item.productId}`);

            if (product.totalAvailableStock < item.quantity) {
                throw new Error(`Insufficient available stock for ${product.title}`);
            }

            product.totalAvailableStock -= item.quantity;
            await product.save({ session });
        }

        // ✅ Create Sale Order
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
            message: "Sale Order created successfully from cleared stock.",
            data: saleOrder
        });
    } catch (err) {
        // ❌ Rollback changes
        await session.abortTransaction();
        session.endSession();

        console.error("🔥 Error creating sale order:", err.message);
        res.status(500).json({
            success: false,
            message: "Server error while creating Sale Order.",
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

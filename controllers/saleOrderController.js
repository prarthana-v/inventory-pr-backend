const SaleOrder = require('../model/saleOrder');
const Inventory = require('../model/inventory')
const WorkAssignment = require('../model/WorkAssignment')
const Product = require('../model/product');
const mongoose = require('mongoose');
const User = require("../model/auth");

// exports.createSaleOrder = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { products, vendor, admin, firm, invoiceNo, invoiceDate, notes } = req.body;

//         if (!products || !Array.isArray(products) || products.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "At least one product with quantity is required."
//             });
//         }

//         // ✅ Format products for SaleOrder schema
//         const formattedProducts = products.map(p => ({
//             product: p.productId,
//             quantity: p.quantity,
//             price: p.price,
//             discount: p.discount || 0
//         }));

//         // ✅ Validate cleared stock and update global product stock
//         for (const item of products) {
//             const clearedAssignments = await WorkAssignment.find({
//                 productId: item.productId,
//                 status: "Cleared"
//             }).session(session);

//             if (!clearedAssignments.length) {
//                 throw new Error(`No cleared stock found for product ${item.productId}`);
//             }

//             // Calculate total cleared quantity available
//             const totalCleared = clearedAssignments.reduce((sum, wa) => sum + wa.quantity, 0);

//             if (totalCleared < item.quantity) {
//                 throw new Error(
//                     `Not enough cleared stock for product ${item.productId}. Available: ${totalCleared}, Required: ${item.quantity}`
//                 );
//             }

//             // ✅ Deduct quantity from the cleared assignments sequentially
//             let remaining = item.quantity;
//             for (const wa of clearedAssignments) {
//                 const deduct = Math.min(wa.quantity, remaining);
//                 wa.quantity -= deduct;
//                 remaining -= deduct;

//                 // If all required quantity deducted, stop
//                 if (remaining <= 0) break;

//                 await wa.save({ session });
//             }

//             // ✅ Update product’s totalAvailableStock
//             const product = await Product.findById(item.productId).session(session);
//             if (!product) throw new Error(`Product not found: ${item.productId}`);

//             if (product.totalAvailableStock < item.quantity) {
//                 throw new Error(`Insufficient available stock for ${product.title}`);
//             }

//             product.totalAvailableStock -= item.quantity;
//             await product.save({ session });
//         }

//         // ✅ Create Sale Order
//         const saleOrder = new SaleOrder({
//             products: formattedProducts,
//             vendor,
//             admin,
//             firm,
//             invoiceNo,
//             invoiceDate,
//             notes
//         });

//         await saleOrder.save({ session });

//         // ✅ Commit transaction
//         await session.commitTransaction();
//         session.endSession();

//         res.status(201).json({
//             success: true,
//             message: "Sale Order created successfully from cleared stock.",
//             data: saleOrder
//         });
//     } catch (err) {
//         // ❌ Rollback changes
//         await session.abortTransaction();
//         session.endSession();

//         console.error("🔥 Error creating sale order:", err.message);
//         res.status(500).json({
//             success: false,
//             message: "Server error while creating Sale Order.",
//             error: err.message
//         });
//     }
// };


// ✅ Get all Sales Orders


exports.createSaleOrder = async (req, res) => { 
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log("📥 Incoming Sale Order Body:", JSON.stringify(req.body, null, 2));

        const { products, vendor, admin, firm, invoiceNo, invoiceDate, notes } = req.body;

        if (!admin) {
            console.warn("⚠️ admin (userId) is missing");
            return res.status(400).json({ success: false, message: "admin (userId) is required" });
        }

        const adminUser = await User.findById(admin);
        if (!adminUser) return res.status(400).json({ message: "Invalid admin userId" });

        console.log(`👤 Logged-in User Role: ${adminUser.role}`);

        let superAdminId;
        if (adminUser.role === "SuperAdmin") superAdminId = adminUser._id;
        else if (adminUser.role === "Admin") superAdminId = adminUser.managingSuperAdmin;
        else return res.status(403).json({ message: "Unauthorized to create sale order" });

        console.log("🟢 Final SuperAdmin ID:", superAdminId);

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product with quantity is required."
            });
        }

        const formattedProducts = products.map(p => ({
            product: p.productId,
            quantity: p.quantity,
            price: p.price,
            discount: p.discount || 0
        }));

        for (const item of products) {
            console.log(`🔍 Processing productId: ${item.productId}, required quantity: ${item.quantity}`);

            // Fetch all cleared WorkAssignments for this product
            const clearedAssignments = await WorkAssignment.find({
                productId: item.productId,
                status: "Cleared"
            }).session(session);

            console.log(`✅ Found ${clearedAssignments.length} cleared WorkAssignments for product ${item.productId}`);

            if (!clearedAssignments.length) {
                throw new Error(`No cleared stock for product ${item.productId}`);
            }

            const totalCleared = clearedAssignments.reduce((sum, wa) => sum + wa.quantity, 0);
            console.log(`📊 Total cleared stock available: ${totalCleared}`);

            if (totalCleared < item.quantity) {
                throw new Error(`Not enough cleared stock for product ${item.productId}. Available: ${totalCleared}, Required: ${item.quantity}`);
            }

            // Deduct stock sequentially
            let remaining = item.quantity;
            for (const wa of clearedAssignments) {
                const deduct = Math.min(wa.quantity, remaining);
                console.log(`🟡 Deducting ${deduct} from WorkAssignment ${wa._id} (Current stock: ${wa.quantity})`);
                wa.quantity -= deduct;
                remaining -= deduct;

                await wa.save({ session });
                if (remaining <= 0) break;
            }

            // Update global product stock
            const product = await Product.findById(item.productId).session(session);
            if (!product) throw new Error(`Product not found: ${item.productId}`);

            console.log(`🟢 Updating totalAvailableStock for Product ${product.title}. Old: ${product.totalAvailableStock}, Deducting: ${item.quantity}`);
            product.totalAvailableStock -= item.quantity;
            await product.save({ session });
        }

        // Create the sale order
        const saleOrder = new SaleOrder({
            products: formattedProducts,
            vendor,
            admin,
            firm,
            invoiceNo,
            invoiceDate,
            notes,
            createdBy: admin,
            superAdmin: superAdminId
        });

        await saleOrder.save({ session });
        await session.commitTransaction();
        session.endSession();

        console.log(`✅ Sale Order created successfully - ID: ${saleOrder._id}`);
        res.status(201).json({ success: true, message: "Sale Order created successfully.", data: saleOrder });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.error("🔥 Error creating sale order:", err.message);
        console.error(err.stack);
        res.status(500).json({ success: false, message: "Error creating Sale Order.", error: err.message });
    }
};

exports.getSalesOrders = async (req, res) => {
    try {
        console.log(req.body,'fetch sale order------------------')
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }

        const user = await User.findById(userId);

        let superAdminId;

        if (user.role === "SuperAdmin") superAdminId = user._id;
        else if (user.role === "Admin") superAdminId = user.managingSuperAdmin;
        else return res.status(403).json({ message: "Unauthorized" });

        console.log("🟣 Fetching Sale Orders for superAdmin:", superAdminId);

        const salesOrders = await SaleOrder.find({ superAdmin: superAdminId })
            .populate("vendor", "name email phone")
            .populate("admin", "name email")
            .populate("firm", "name")
            .populate("products.product", "name sku")
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: salesOrders.length,
            data: salesOrders
        });

    } catch (err) {
        console.error("🔥 Error fetching sales orders:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching sales orders.",
            error: err.message
        });
    }
};

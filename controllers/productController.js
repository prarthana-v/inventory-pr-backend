const Product = require("../model/product");
const WorkAssignment = require("../model/WorkAssignment");
const Inventory = require('../model/inventory');
const User = require('../model/auth');

// Creates a new product using request body data
// CREATE PRODUCT
exports.createProduct = async (req, res) => {
    try {
        console.log("📝 [CREATE PRODUCT] Incoming:", req.body);
        console.log("📸 Uploaded file:", req.file);

        const { title, categoryId, type, userId } = req.body;

        // VALIDATION
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "userId is required"
            });
        }

        if (!title || !categoryId || !type) {
            return res.status(400).json({
                success: false,
                error: "title, categoryId, and type are required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Product image is required"
            });
        }

        // FETCH CREATOR
        const creator = await User.findById(userId);
        if (!creator) {
            return res.status(400).json({ success: false, error: "Invalid userId" });
        }

        // DETERMINE SUPERADMIN
        let superAdminId;

        if (creator.role === "SuperAdmin") {
            superAdminId = creator._id;
        } else if (creator.role === "Admin") {
            if (!creator.managingSuperAdmin) {
                return res.status(400).json({ error: "Admin not assigned to any SuperAdmin" });
            }
            superAdminId = creator.managingSuperAdmin;
        } else {
            return res.status(403).json({
                success: false,
                error: "Only SuperAdmin/Admin can create products"
            });
        }

        console.log("📌 Final superAdminId:", superAdminId.toString());

        // PREPARE DATA
        const productData = {
            title,
            categoryId,
            type,
            superAdmin: superAdminId,
            createdBy: creator._id,
            description: req.body.description || "",
            sku: req.body.sku || null,
            totalAvailableStock: req.body.totalAvailableStock || 0,
            image: req.file.filename
        };

        // CREATE PRODUCT
        const product = await Product.create(productData);
        console.log("✅ Product Created:", product._id);

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        });

    } catch (err) {
        console.error("❌ CREATE PRODUCT ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Server error while creating product",
            details: err.message
        });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const { userId } = req.body;

        console.log("📥 [GET PRODUCTS] userId:", userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "userId is required"
            });
        }

        // GET USER
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ success: false, error: "Invalid userId" });
        }

        // DETERMINE SUPERADMIN
        let superAdminId;

        if (user.role === "SuperAdmin") {
            superAdminId = user._id;
        } else if (user.role === "Admin") {
            superAdminId = user.managingSuperAdmin;
        } else {
            return res.status(403).json({ error: "Unauthorized role" });
        }

        console.log("📌 Fetching products for SuperAdmin:", superAdminId.toString());

        // FETCH ALL NON-DELETED PRODUCTS FOR THIS SUPERADMIN
        const products = await Product.find({
            superAdmin: superAdminId,
            isDeleted: false
        }).populate("categoryId", "name");

        console.log(`📦 Found ${products.length} products`);

        return res.status(200).json({
            success: true,
            products
        });

    } catch (err) {
        console.error("❌ GET PRODUCTS ERROR:", err.message);
        res.status(500).json({
            success: false,
            error: "Server error while fetching products",
            details: err.message
        });
    }
};

exports.getProductById = async (req, res) => {
    try {
        console.log("[GET ONE] Product ID:", req.params.id);
        const product = await Product.findById(req.params.id)
            .populate("categoryId", "name")
            .populate("vendorId", "name");
        if (!product) {
            console.warn("[GET ONE] Product not found:", req.params.id);
            return res.status(404).json({ error: "Product not found" });
        }
        console.log("[GET ONE] Product found:", product._id);
        res.json(product);
    } catch (err) {
        console.error("[GET ONE] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        // req.body will now be correctly populated!
        console.log(req.body, req.params, 'req body-update------------------');

        // This part is still correct
        const { productId, ...updates } = req.body;

        if (!productId) {
            console.warn("⚠️ productId missing in request body.");
            return res.status(400).json({ error: "productId is required." });
        }

        // ✨ NEW: Check if a new file was uploaded by multer
        if (req.file) {
            console.log("📄 [UPDATE] New file received:", req.file.filename);
            updates.image = req.file.filename; // Add new image to the updates
        }

        // Remove undefined/null keys so they don't overwrite existing fields
        Object.keys(updates).forEach(
            key => (updates[key] === undefined || updates[key] === null) && delete updates[key]
        );

        console.log(`🔧 Updating product: ${productId} with data:`, updates);

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updates }, // $set will apply all fields in the 'updates' object
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            console.warn(`⚠️ Product not found: ${productId}`);
            return res.status(404).json({ error: "Product not found" });
        }

        console.log(`✅ Product updated: ${updatedProduct._id}`);
        return res.status(200).json({
            message: "Product updated successfully.",
            product: updatedProduct
        });
    } catch (err) {
        console.error("❌ Error updating product:", err.message);
        return res.status(500).json({ error: "Server error while updating product." });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            console.warn("⚠️ productId is missing in request body.");
            return res.status(400).json({ error: "productId is required." });
        }

        console.log(`🗑️ Attempting to delete product: ${productId}`);

        // 1️⃣ Check if product is used in any WorkAssignment
        const assigned = await WorkAssignment.exists({ productId });
        if (assigned) {
            console.warn(`🚫 Product ${productId} is linked to a WorkAssignment.`);
            return res.status(400).json({
                error: "This product is linked with a work assignment and cannot be deleted."
            });
        }

        // 2️⃣ Check if product exists in any Inventory
        const inInventory = await Inventory.exists({ "products.product": productId });
        if (inInventory) {
            console.warn(`🚫 Product ${productId} is linked to an Inventory.`);
            return res.status(400).json({
                error: "This product is associated with an inventory record and cannot be deleted."
            });
        }

        // 3️⃣ Proceed with soft delete
        const deletedProduct = await Product.findOneAndUpdate(
            { _id: productId, isDeleted: false },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date()
                }
            },
            { new: true }
        );

        if (!deletedProduct) {
            console.warn(`⚠️ Product not found or already deleted: ${productId}`);
            return res.status(404).json({ error: "Product not found or already deleted." });
        }

        console.log(`✅ Product soft deleted: ${deletedProduct._id}`);

        return res.status(200).json({
            message: "Product soft deleted successfully.",
            product: {
                id: deletedProduct._id,
                title: deletedProduct.title
            }
        });

    } catch (err) {
        console.error("❌ Error deleting product:", err.message);
        return res.status(500).json({ error: "Server error while deleting product." });
    }
};

exports.getAllClearedProducts = async (req, res) => {
    try {
        const clearedProducts = await WorkAssignment.find({ status: "Cleared" })
            .populate({
                path: "productId",
                populate: {
                    path: "categoryId", // also populate category inside product
                    select: "name image"
                }
            })
            .lean();

        console.log("✅ Total cleared products fetched:", clearedProducts.length);

        // Log how many have missing productId
        const missingProducts = clearedProducts.filter(item => !item.productId);
        if (missingProducts.length > 0) {
            console.warn("⚠️ WorkAssignments with missing productId:", missingProducts.map(m => m._id));
        }

        // Log a few samples for debugging
        console.log("🧩 Sample populated data (first 2):", clearedProducts.slice(0, 2));

        return res.status(200).json({
            success: true,
            clearedProducts: clearedProducts.map(item => ({
                _id: item.productId._id,          // product id
                title: item.productId.title,
                description: item.productId.description,
                type: item.productId.type,
                categoryId: item.productId.categoryId, // populated object { _id, name }
                sku: item.productId.sku,
                createdAt: item.productId.createdAt,
                updatedAt: item.productId.updatedAt,
                quantity: item.quantity            // from WorkAssignment
            }))
        });

    } catch (err) {
        console.error("🔥 Error in getAllClearedProducts:", err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getProductDetailsReport = async (req, res) => {
    try {
        console.log("📌 Incoming Request (Product Report):", req.body);

        const { userId } = req.body;

        if (!userId) {
            console.log("❌ userId missing");
            return res.status(400).json({ message: "userId is required" });
        }

        // Fetch user
        const user = await User.findById(userId);
        console.log("👤 User Fetched:", user ? user.role : "User Not Found");

        if (!user) return res.status(400).json({ message: "Invalid userId" });

        let superAdminId;

        if (user.role === "SuperAdmin") {
            superAdminId = user._id;
            console.log("🟦 Role: SuperAdmin → Using own ID:", superAdminId);
        } else if (user.role === "Admin") {
            superAdminId = user.managingSuperAdmin;
            console.log("🟩 Role: Admin → Using managingSuperAdmin:", superAdminId);
        } else {
            console.log("❌ Unauthorized role");
            return res.status(403).json({ message: "Unauthorized" });
        }

        console.log("🔍 Fetching product report for SuperAdmin:", superAdminId);

        const productReport = await Product.aggregate([

            // Stage 0: Filter products by superAdmin
            {
                $match: {
                    superAdmin: superAdminId
                }
            },

            // Stage 1: Lookup assignments
            {
                $lookup: {
                    from: "workassignments",
                    localField: "_id",
                    foreignField: "productId",
                    as: "assignments"
                }
            },

            // Stage 2: Stock calculations
            {
                $addFields: {
                    totalAssignedStock: { $sum: "$assignments.quantity" },
                    clearedStock: { $sum: "$assignments.clearedQuantity" },
                    lostStock: { $sum: "$assignments.lostlQuantity" },
                    damagedStock: { $sum: "$assignments.damagedQuantity" }
                }
            },

            // Stage 3: Format final result
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    productTitle: "$title",
                    productImage: "$image",
                    totalAvailableStock: "$totalAvailableStock",
                    totalAssignedStock: { $ifNull: ["$totalAssignedStock", 0] },
                    clearedStock: { $ifNull: ["$clearedStock", 0] },
                    lostStock: { $ifNull: ["$lostStock", 0] },
                    damagedStock: { $ifNull: ["$damagedStock", 0] }
                }
            },

            // Stage 4: Sort alphabetically
            { $sort: { productTitle: 1 } }
        ]);

        console.log("📦 Final Product Report Count:", productReport.length);

        res.status(200).json({
            success: true,
            message: "✅ Product details report generated successfully.",
            data: productReport
        });

    } catch (err) {
        console.error("🔥 Error generating product report:", err);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message
        });
    }
};

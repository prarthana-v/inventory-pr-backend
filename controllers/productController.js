const Product = require("../model/product");
const WorkAssignment = require("../model/WorkAssignment")

// Creates a new product using request body data
exports.createProduct = async (req, res) => {
    try {
        console.log("📝 [CREATE] Request body:", req.body);
        console.log("📄 [CREATE] File:", req.file);

        if (!req.body.title || !req.body.categoryId || !req.file) {
            console.warn("⚠️ [CREATE] Missing required fields: title, categoryId, or image");
            return res.status(400).json({ error: "Missing required fields: title, categoryId, or image" });
        }

        // Example: Check for required fields (adjust as needed)
        if (!req.body.title || !req.body.categoryId) {
            console.warn("⚠️ [CREATE] Missing required fields: title or categoryId");
            return res.status(400).json({ error: "Missing required fields: title or categoryId" });
        }

        const productData = {
            ...req.body,
            image: req.file.filename  // Save the file path to the image field
        };

        const product = await Product.create(productData);

        console.log("✅ [CREATE] Product created:", product);
        res.status(201).json(product);
    } catch (err) {
        console.log("❌ [CREATE] Error:", err);
        res.status(500).json({ error: "Server error while creating product." });
    }
};

// Fetches all products, supports query filters
exports.getAllProducts = async (req, res) => {
    try {
        const filters = { ...req.query };
        console.log("[GET ALL] Fetching non-deleted products with filters:", filters);

        // 🔥 Fetch only non-deleted products
        const products = await Product.find({
            isDeleted: false,
        }).populate("categoryId", "name");

        console.log(`[GET ALL] Found ${products.length} active products`);

        res.json(products);
    } catch (err) {
        console.error("[GET ALL] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Fetches a single product by its ID
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

// Updates a product by its ID with new data
// In productController.js

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

// Deletes a product by its ID
exports.deleteProduct = async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            console.warn("⚠️ productId is missing in request body.");
            return res.status(400).json({ error: "productId is required." });
        }

        console.log(`🗑️ Deleting product: ${productId}`);

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

        console.log(`✅ Product deleted: ${deletedProduct._id}`);
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
        console.log("📊 Generating detailed product report (including unassigned)...");

        const productReport = await Product.aggregate([
            // Stage 1: Lookup assignments for each product
            {
                $lookup: {
                    from: "workassignments", // Collection name for assignments
                    localField: "_id",       // Product _id
                    foreignField: "productId", // Field in WorkAssignment
                    as: "assignments"
                }
            },

            // Stage 2: Add calculated totals (handle products with no assignments)
            {
                $addFields: {
                    totalAssignedStock: { $sum: "$assignments.quantity" },
                    clearedStock: { $sum: "$assignments.clearedQuantity" },
                    lostStock: { $sum: "$assignments.lostlQuantity" },
                    damagedStock: { $sum: "$assignments.damagedQuantity" }
                }
            },

            // Stage 3: Project the final output
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
            {
                $sort: { productTitle: 1 }
            }
        ]);

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

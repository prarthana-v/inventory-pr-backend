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
        // console.log("[GET ALL] Filters:", filters);
        const products = await Product.find()
            .populate("categoryId", "name")
        console.log(`[GET ALL] Found ${products.length} products`);
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
exports.updateProduct = async (req, res) => {
    try {
        const { productId, ...updates } = req.body;

        if (!productId) {
            console.warn("⚠️ productId missing in request body.");
            return res.status(400).json({ error: "productId is required." });
        }

        // Remove undefined/null keys so they don't overwrite existing fields
        Object.keys(updates).forEach(
            key => (updates[key] === undefined || updates[key] === null) && delete updates[key]
        );

        console.log(`🔧 Updating product: ${productId} with data:`, updates);

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updates },
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

        const deletedProduct = await Product.findByIdAndDelete(productId);

        if (!deletedProduct) {
            console.warn(`⚠️ Product not found: ${productId}`);
            return res.status(404).json({ error: "Product not found." });
        }

        console.log(`✅ Product deleted: ${deletedProduct._id}`);
        return res.status(200).json({
            message: "Product deleted successfully.",
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
                    select: "name"
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


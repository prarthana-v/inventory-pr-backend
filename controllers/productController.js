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
        console.log("📊 Generating detailed product report...");

        const productReport = await WorkAssignment.aggregate([
            // Stage 1: Group all assignments by their product ID and sum up the quantities.
            {
                $group: {
                    _id: "$productId", // Group by the product ID

                    totalAssignedStock: { $sum: "$quantity" },
                    clearedStock: { $sum: "$clearedQuantity" },
                    lostStock: { $sum: "$shortageQuantity" },
                    damagedStock: { $sum: "$secondsQuantity" }
                }
            },

            // Stage 2: Join with the 'products' collection to get product details like name and available stock.
            {
                $lookup: {
                    from: "products", // The collection to join with
                    localField: "_id", // The field from the input documents (the grouped assignments)
                    foreignField: "_id", // The field from the documents of the "from" collection
                    as: "productInfo" // The name of the new array field to add
                }
            },

            // Stage 3: The $lookup stage creates an array. We use $unwind to deconstruct it.
            {
                $unwind: "$productInfo"
            },

            // Stage 4: Project the final shape of our data to match what you need.
            {
                $project: {
                    _id: 0, // Exclude the default _id field
                    productId: "$_id",
                    productTitle: "$productInfo.title",
                    productImage: "$productInfo.image", // Assuming you have an 'image' field
                    totalAvailableStock: "$productInfo.totalAvailableStock",
                    totalAssignedStock: "$totalAssignedStock",
                    clearedStock: "$clearedStock",
                    lostStock: "$lostStock",
                    damagedStock: "$damagedStock"
                }
            },

            // Optional Stage 5: Sort the results alphabetically by product title.
            {
                $sort: {
                    productTitle: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Product details report generated successfully.",
            data: productReport
        });

    } catch (err) {
        console.error("🔥 Error generating product report:", err);
        res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
};
const AdditionalItem = require("../model/additionalItem");

// CREATE
exports.createAdditionalItem = async (req, res) => {
    console.log("🆕 [CREATE] Incoming request body:", req.body);
    try {
        const item = await AdditionalItem.create(req.body);
        console.log("✅ [CREATE] Additional item created:", item._id);
        res.status(201).json(item);
    } catch (error) {
        console.error("❌ [CREATE] Error creating additional item:", error.message);
        res.status(400).json({ error: "Failed to create item", details: error.message });
    }
};

// READ ALL
exports.getAdditionalItems = async (req, res) => {
    console.log("📦 [GET ALL] Fetching all additional items...");
    try {
        const items = await AdditionalItem.find().populate("productId");
        console.log(`✅ [GET ALL] Found ${items.length} items`);
        res.json(items);
    } catch (error) {
        console.error("❌ [GET ALL] Error fetching items:", error.message);
        res.status(500).json({ error: "Failed to fetch items", details: error.message });
    }
};

// READ ONE
exports.getAdditionalItem = async (req, res) => {
    console.log("🔍 [GET ONE] ID:", req.params.id);
    try {
        const item = await AdditionalItem.findById(req.params.id).populate("productId");
        if (!item) {
            console.warn("⚠️ [GET ONE] Item not found:", req.params.id);
            return res.status(404).json({ error: "Item not found" });
        }
        console.log("✅ [GET ONE] Item fetched:", item._id);
        res.json(item);
    } catch (error) {
        console.error("❌ [GET ONE] Error fetching item:", error.message);
        res.status(500).json({ error: "Failed to fetch item", details: error.message });
    }
};

// UPDATE
exports.updateAdditionalItem = async (req, res) => {
    console.log("✏️ [UPDATE] ID:", req.params.id, "Body:", req.body);
    try {
        const item = await AdditionalItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) {
            console.warn("⚠️ [UPDATE] Item not found:", req.params.id);
            return res.status(404).json({ error: "Item not found" });
        }
        console.log("✅ [UPDATE] Item updated:", item._id);
        res.json(item);
    } catch (error) {
        console.error("❌ [UPDATE] Error updating item:", error.message);
        res.status(400).json({ error: "Failed to update item", details: error.message });
    }
};

// DELETE
exports.deleteAdditionalItem = async (req, res) => {
    console.log("🗑️ [DELETE] ID:", req.params.id);
    try {
        const item = await AdditionalItem.findByIdAndDelete(req.params.id);
        if (!item) {
            console.warn("⚠️ [DELETE] Item not found:", req.params.id);
            return res.status(404).json({ error: "Item not found" });
        }
        console.log("✅ [DELETE] Item deleted:", item._id);
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("❌ [DELETE] Error deleting item:", error.message);
        res.status(500).json({ error: "Failed to delete item", details: error.message });
    }
};

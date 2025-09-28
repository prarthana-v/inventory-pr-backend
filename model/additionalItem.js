const mongoose = require("mongoose");

const AdditionalItemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    sku: {
        type: String,
        unique: true,
        sparse: true
    },
    image: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model("AdditionalItem", AdditionalItemSchema);

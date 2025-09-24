const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['saree', 'dress'],
        required: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    sku: {
        type: String,
        unique: true
    },
    image: {
        type: String,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);

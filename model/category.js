const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    superAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: { type: String, required: true },   // Category name, unique
    description: { type: String },                            // Optional description
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // For sub-categories
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }

});

module.exports = mongoose.model('Category', CategorySchema);

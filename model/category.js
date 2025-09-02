const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },   // Category name, unique
    description: { type: String },                            // Optional description
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null } // For sub-categories
});

module.exports = mongoose.model('Category', CategorySchema);

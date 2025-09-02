const express = require('express');
const { createCategory, updateCategory, deleteCategory, getAllCategories, getCategoryById, getCategoryByFirmId } = require('../controllers/categoryController');
const router = express.Router();

// Add category
router.post('/create-category', createCategory);

// Edit category
router.put('/update-category', updateCategory);

// Delete category
router.delete('/delete-category', deleteCategory);

// List all categories
router.get('/all-categories', getAllCategories);

// Get category details (optionally with products)
router.get('/getcategorybyid', getCategoryById);

module.exports = router;

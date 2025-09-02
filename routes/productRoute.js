const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/productController');

router.post("/create-product", createProduct);
router.get("/all-products", getAllProducts);
router.get("/:id", getProductById);
router.put("/update-product", updateProduct);
router.delete("/delete-product", deleteProduct);

module.exports = router;

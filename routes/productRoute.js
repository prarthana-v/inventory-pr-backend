const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, getAllClearedProducts } = require('../controllers/productController');

router.post("/create-product", createProduct);
router.get("/all-products", getAllProducts);
router.get("/all-cleared-products", getAllClearedProducts)
router.put("/update-product", updateProduct);
router.delete("/delete-product", deleteProduct);
router.get("/getProduct/:id", getProductById);

module.exports = router;

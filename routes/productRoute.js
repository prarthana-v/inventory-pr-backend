const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, getAllClearedProducts, getProductDetailsReport } = require('../controllers/productController');
const upload = require('../middleware/upload');

router.post("/create-product", upload.single('image'), createProduct);
router.get("/all-products", getAllProducts);
router.get("/all-cleared-products", getAllClearedProducts)
router.put("/update-product", upload.single('image'), updateProduct);
router.delete("/delete-product", deleteProduct);
router.get("/getProduct/:id", getProductById);

module.exports = router;

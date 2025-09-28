const express = require('express');
const router = express.Router();
const { getProductDetailsReport } = require('../controllers/productController');

router.get("/product-details", getProductDetailsReport)

module.exports = router;

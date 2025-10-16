const express = require('express');
const router = express.Router();
const { getProductDetailsReport } = require('../controllers/productController');

//product stock summary table's api
router.get("/product-details", getProductDetailsReport)

module.exports = router;

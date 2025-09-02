const express = require('express');
const { createSaleOrder, getSalesOrders } = require('../controllers/saleOrderController');
const router = express.Router();

router.post('/create-salesorder', createSaleOrder)
router.get('/all-salesorder', getSalesOrders)

module.exports = router;
const express = require('express');
const { route } = require('./authRoute');
const router = express.Router();

router.use('/auth', require('./authRoute'));
router.use('/firm', require('./firmRoute'));
router.use('/category', require('./categoryRoute'));
router.use('/vendor', require('./vendorRoute'));
router.use('/product', require('./productRoute'));
router.use('/jobworker', require('./jobworkerRoute'));
router.use('/inventory', require('./inventoryRoute'));
router.use('/salesorder', require('./salesOrderRoute'));
router.use('/plans', require('./planRoute'));
router.use('/items', require('./additionalItemRoute'));
router.use("/reports", require("./reportRoute"));
router.use("/return-requests", require("./inventoryRoute"))

module.exports = router;

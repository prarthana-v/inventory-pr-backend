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
/// Jobworker? karu ok
module.exports = router;

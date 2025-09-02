// vendor.routes.js
const express = require('express');
const router = express.Router();
const { createVendor, getAllVendors, deleteVendor, updateVendor, getVendorById } = require('../controllers/vendorController');

// 👇 API Endpoints
router.post('/create-vendor', createVendor);           // Create vendor
router.get('/all-vendor', getAllVendors);           // Get all vendors
router.get('/getvendorbyid', getVendorById);        // Get single vendor by ID
router.put('/update-vendor', updateVendor);         // Update vendor
router.delete('/delete-vendor', deleteVendor);      // Delete vendor
router.get('/getvendorbyfirm', getVendorById);        //

module.exports = router;

const express = require('express');
const { createInventory, updateInventory, getInventoryById, getInventories, deleteInventory, getAssignments, assignToWorkers, getProductStockSummary, getAssignmentsByJobWorker, getInventoryHistory, receiveAssignmentReturn } = require('../controllers/inventoryController');
const { submitReturnRequest, reviewReturnRequest, directReturnProcess, getPendingReturnRequests, getMyReturnRequests } = require('../controllers/returnController');
const upload = require('../middleware/upload');
const router = express.Router();

router.post('/add-inventory', createInventory);
router.put('/update-inventory', updateInventory);
router.get('/get-inventory', getInventoryById);
router.post('/all-inventory', getInventories);
router.delete('/delete-inventory', deleteInventory);

router.post(
    '/assign-stock',
    upload.any(),   // accept ANY file → simplest for dynamic index images
    assignToWorkers
);

router.post('/get-assignments', getAssignments);

//view challan api
router.get('/get-assigned-products', getAssignmentsByJobWorker);

router.get("/stock-summary", getProductStockSummary);
router.get('/history', getInventoryHistory);

// 1. For a Jobworker/Admin to SUBMIT a request for approval
// (Assuming you have auth middleware to get req.user.id)
router.post('/submit', submitReturnRequest);

// 2. For a Super-admin to APPROVE or REJECT a request
// (Assuming you have auth/role middleware)
router.put('/review', reviewReturnRequest);

// --- NEW ROUTE FOR SUPER-ADMIN ---
// This route bypasses the pending approval step
router.post('/direct-process', directReturnProcess);

// --- NEW ROUTE TO GET PENDING REQUESTS ---
router.get('/pending', getPendingReturnRequests);


// to get jobworker's return-returns in jobworker panel
router.get('/my-requests', getMyReturnRequests);

router.put('/receive-assignment-return', receiveAssignmentReturn);

module.exports = router;

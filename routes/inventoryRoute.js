const express = require('express');
const { createInventory, updateInventory, getInventoryById, getInventories, deleteInventory, assignInventory, assignToJobWorker, getAssignments, assignToWorkers, updateAssignmentStatus, updateWorkAssignmentStatus, getFirmAssignments, getInventoryWithJW, getInventoriesByJW, clearAssignmentQuantity, getProductStockSummary, getAssignmentsByJobWorker, receiveAssignmentReturn } = require('../controllers/inventoryController');
const router = express.Router();

router.post('/add-inventory', createInventory)
router.put('/update-inventory', updateInventory)
router.get('/get-inventory', getInventoryById)
router.post('/all-inventory', getInventories);
router.delete('/delete-inventory', deleteInventory)
router.post('/assign-stock', assignToWorkers)
// router.put('/update-assignment-status', updateWorkAssignmentStatus);
// router.put('/clear-assignment-quantity', clearAssignmentQuantity);
router.post('/get-assignments', getAssignments);
router.get('/get-assigned-products', getAssignmentsByJobWorker);
router.get("/stock-summary", getProductStockSummary);
router.put('/receive-assignment-return', receiveAssignmentReturn);

module.exports = router;

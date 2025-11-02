// vendor.routes.js
const express = require('express');
const { createJobWorker, getAllJobWorkers, deleteJobWorker, updateJobWorker, loginJobworker, getAssignedProductsCount, getAssignedInventoryStatusCounts, forgotPassword, resetPassword, restoreJobWorker, getJobWorkerDashboard } = require('../controllers/jobworkerController');
const router = express.Router();

// 👇 API Endpoints
router.post('/create-jobworker', createJobWorker);
router.get('/all-jobworkers', getAllJobWorkers);
router.put('/update-jobworker', updateJobWorker);
router.delete('/delete-jobworker', deleteJobWorker);
router.post('/login-jobworker', loginJobworker);
router.post('/jobworker-inventory', getAssignedProductsCount);
router.post('/assigned-products-bystatus', getAssignedInventoryStatusCounts)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/restore-jobworker', restoreJobWorker);

// used in job worker panel to get jobworker dashboard
router.post('/get-dashboard', getJobWorkerDashboard);

module.exports = router;

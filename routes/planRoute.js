const express = require('express');
const { getAllPlans, getPlanById, createPlan, updatePlan, deletePlan } = require('../controllers/planController');
const router = express.Router();

// GET all plans
// Route: GET /api/plans
router.get('/all-plans', getAllPlans);

// GET a single plan by ID
// Route: GET /api/plans/:id
router.get('/getPlanbyId', getPlanById);

// CREATE a new plan
// Route: POST /api/plans
router.post('/create-plan', createPlan);

// UPDATE a plan by ID
// Route: PUT /api/plans/:id
router.put('/update-plan/:id', updatePlan);

// DELETE a plan by ID
// Route: DELETE /api/plans/:id
router.delete('/delete-plan/:id', deletePlan);

module.exports = router;
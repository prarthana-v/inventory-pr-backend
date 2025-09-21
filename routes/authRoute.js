const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserByEmail, getAllAdmins, deleteUserById, getAllUsers, getCounts, assignPlan } = require('../controllers/authController');
const { assignFirmToAdmin } = require('../controllers/firmController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/getuser', getUserByEmail);
router.get('/getalladmins', getAllAdmins);
router.get("/all-users", getAllUsers)
router.delete('/delete-user', deleteUserById);
router.get('/get-counts', getCounts)
router.post("/assign-plan/:id", assignPlan)

module.exports = router;

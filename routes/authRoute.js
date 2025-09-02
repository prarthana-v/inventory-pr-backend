const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserByEmail, getAllAdmins, deleteUserById } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/getuser', getUserByEmail);
router.get('/getalladmins', getAllAdmins);
router.delete('/delete-user', deleteUserById);

module.exports = router;

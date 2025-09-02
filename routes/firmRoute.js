const express = require('express');
const { createFirm, getAllFirms, getFirmById, getFirmsByAdminId, editFirm, deleteFirm, assignFirmToAdmin } = require('../controllers/firmController');
const router = express.Router();

router.post('/create-firm', createFirm)
router.get('/all-firms', getAllFirms);
router.get('/getfirmbyid', getFirmById);
router.get('/getfirms-admin', getFirmsByAdminId);
router.put('/update-firm', editFirm);
router.delete('/delete-firm', deleteFirm);
router.post('/assign-firm', assignFirmToAdmin)

module.exports = router;

const express = require("express");
const router = express.Router();
const additionalItemController = require("../controllers/additionalItemController");

router.post("/create-item", additionalItemController.createAdditionalItem);
router.get("/get-items", additionalItemController.getAdditionalItems);
router.get("/get-item/:id", additionalItemController.getAdditionalItem);
router.put("/update-item/:id", additionalItemController.updateAdditionalItem);
router.delete("/delete-item/:id", additionalItemController.deleteAdditionalItem);

module.exports = router;

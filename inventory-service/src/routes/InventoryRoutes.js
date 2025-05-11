const express = require("express");
const InventoryController = require("../controllers/InventoryController");
const router = express.Router();

router.get("/health", InventoryController.health);

module.exports = router;
const express = require("express");
const InventoryController = require("../controllers/InventoryController");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");

router.get("/health", InventoryController.health);

module.exports = router;
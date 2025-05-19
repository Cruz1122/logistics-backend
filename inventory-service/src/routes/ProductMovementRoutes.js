const express = require("express");
const InventoryController = require("../controllers/InventoryController");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");

router.get(
  "/",
  authenticateJWT,
  authorize("Product-Movement Management", "listar"),
  InventoryController.getAll
);

module.exports = router;
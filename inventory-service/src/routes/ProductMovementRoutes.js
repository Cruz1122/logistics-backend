const express = require("express");
const ProductMovementController = require("../controllers/ProductMovementController");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");

router.get(
  "/",
  authenticateJWT,
  authorize("Product-Movement Management", "listar"),
  ProductMovementController.getAll
);

router.get(
  "/:id",
  authenticateJWT,
  authorize("Product-Movement Management", "listar"),
  ProductMovementController.getById
);

module.exports = router;
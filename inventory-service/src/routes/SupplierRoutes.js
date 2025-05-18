const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const SupplierController = require("../controllers/SupplierController");

router.get(
  "/",
  authenticateJWT,
  authorize("Supplier Management", "listar"),
  SupplierController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Supplier Management", "listar"),
  SupplierController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Supplier Management", "crear"),
  SupplierController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Supplier Management", "editar"),
  SupplierController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Supplier Management", "eliminar"),
  SupplierController.remove
);

module.exports = router;
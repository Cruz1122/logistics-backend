const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const ProductSupplierController = require("../controllers/ProductSupplierController");

router.get(
  "/",
  authenticateJWT,
  authorize("Product-Supplier Management", "listar"),
  ProductSupplierController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Product-Supplier Management", "listar"),
  ProductSupplierController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Product-Supplier Management", "crear"),
  ProductSupplierController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Product-Supplier Management", "editar"),
  ProductSupplierController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Product-Supplier Management", "eliminar"),
  ProductSupplierController.remove
);

module.exports = router;

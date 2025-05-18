const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const ProductWarehouseController = require("../controllers/ProductWarehouseController");

router.get(
  "/",
  authenticateJWT,
  authorize("Product-Warehouse Management", "listar"),
  ProductWarehouseController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Product-Warehouse Management", "listar"),
  ProductWarehouseController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Product-Warehouse Management", "crear"),
  ProductWarehouseController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Product-Warehouse Management", "editar"),
  ProductWarehouseController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Product-Warehouse Management", "eliminar"),
  ProductWarehouseController.remove
);

module.exports = router;
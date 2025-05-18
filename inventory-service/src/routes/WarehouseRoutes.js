const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const WarehouseController = require("../controllers/WarehouseController");

router.get(
  "/",
  authenticateJWT,
  authorize("Warehouse Management", "listar"),
  WarehouseController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Warehouse Management", "listar"),
  WarehouseController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Warehouse Management", "crear"),
  WarehouseController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Warehouse Management", "editar"),
  WarehouseController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Warehouse Management", "eliminar"),
  WarehouseController.remove
);

module.exports = router;
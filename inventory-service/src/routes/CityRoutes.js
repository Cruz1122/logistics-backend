const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const CityController = require("../controllers/CityController");

router.get(
  "/",
  authenticateJWT,
  authorize("City Management", "listar"),
  CityController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("City Management", "listar"),
  CityController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("City Management", "crear"),
  CityController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("City Management", "editar"),
  CityController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("City Management", "eliminar"),
  CityController.remove
);

module.exports = router;
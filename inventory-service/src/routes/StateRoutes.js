const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const StateController = require("../controllers/StateController");

router.get(
  "/",
  authenticateJWT,
  authorize("State Management", "listar"),
  StateController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("State Management", "listar"),
  StateController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("State Management", "crear"),
  StateController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("State Management", "editar"),
  StateController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("State Management", "eliminar"),
  StateController.remove
);

module.exports = router;
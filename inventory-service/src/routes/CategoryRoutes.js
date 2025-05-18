const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const CategoryController = require("../controllers/CategoryController");

router.get(
  "/",
  authenticateJWT,
  authorize("Category Management", "listar"),
  CategoryController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Category Management", "listar"),
  CategoryController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Category Management", "crear"),
  CategoryController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Category Management", "editar"),
  CategoryController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Category Management", "eliminar"),
  CategoryController.remove
);

module.exports = router;
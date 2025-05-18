const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const ProductController = require("../controllers/ProductController");

router.get(
  "/",
  authenticateJWT,
  authorize("Product Management", "listar"),
  ProductController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Product Management", "listar"),
  ProductController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Product Management", "crear"),
  ProductController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Product Management", "editar"),
  ProductController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Product Management", "eliminar"),
  ProductController.remove
);

module.exports = router;

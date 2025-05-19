const express = require("express");
const ProductMovementController = require("../controllers/ProductMovementController");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");

/**
 * @swagger
 * tags:
 *   name: Product-Movement
 *   description: Tracks the movement of products across warehouses
 */

/**
 * @swagger
 * /product-movement:
 *   get:
 *     summary: Get all product movements
 *     tags: [Product-Movement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of product movements
 */

/**
 * @swagger
 * /product-movement/{id}:
 *   get:
 *     summary: Get a specific product movement by ID
 *     tags: [Product-Movement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product movement found
 *       404:
 *         description: Not found
 */


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
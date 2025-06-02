const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const ProductWarehouseController = require("../controllers/ProductWarehouseController");

/** 
* @swagger
 * tags:
 *   name: Product-Warehouse
 *   description: Manage products stored in warehouses
 */

/**
 * @swagger
 * /product-warehouse:
 *   get:
 *     summary: Get all product-warehouse records
 *     tags: [Product-Warehouse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of product-warehouse records
 *   post:
 *     summary: Create a new product-warehouse record
 *     tags: [Product-Warehouse]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - warehouseId
 *               - stockQuantity
 *               - reorderLevel
 *               - lastRestock
 *               - expirationDate
 *               - status
 *             properties:
 *               productId:
 *                 type: string
 *               warehouseId:
 *                 type: string
 *               stockQuantity:
 *                 type: integer
 *               reorderLevel:
 *                 type: integer
 *               lastRestock:
 *                 type: string
 *                 format: date-time
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Record created
 */

/**
 * @swagger
 * /product-warehouse/{id}:
 *   get:
 *     summary: Get a product-warehouse record by ID
 *     tags: [Product-Warehouse]
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
 *         description: Record found
 *   put:
 *     summary: Update a product-warehouse record
 *     tags: [Product-Warehouse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stockQuantity:
 *                 type: integer
 *               reorderLevel:
 *                 type: integer
 *               lastRestock:
 *                 type: string
 *                 format: date-time
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record updated
 *   delete:
 *     summary: Delete a product-warehouse record
 *     tags: [Product-Warehouse]
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
 *         description: Record deleted
 */

/**
 * @swagger
 * /product-warehouse/decrement-stock:
 *   patch:
 *     summary: Decrement stock for a product in a warehouse
 *     tags: [Product-Warehouse]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID to decrement stock for
 *               quantity:
 *                 type: integer
 *                 description: Quantity to decrement
 *     responses:
 *       200:
 *         description: Stock decremented successfully
 *       404:
 *         description: No warehouse found with enough stock for this productId
 */

router.patch(
  "/decrement-stock",
  authenticateJWT,
  authorize("Product-Warehouse Management", "editar"),
  ProductWarehouseController.decrementStock
);


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
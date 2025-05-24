const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const {
  getAllOrderProducts,
  getOrderProductById,
  createOrderProduct,
  updateOrderProduct,
  deleteOrderProduct,
} = require("../controllers/OrderProductController");

/**
 * @swagger
 * tags:
 *   name: OrderProducts
 *   description: Manage products within orders
 */

/**
 * @swagger
 * /order-products:
 *   get:
 *     summary: Retrieve all order products
 *     tags: [OrderProducts]
 *     responses:
 *       200:
 *         description: List of order products
 *   post:
 *     summary: Add a product to an order
 *     tags: [OrderProducts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - productId
 *               - quantity
 *               - unitPrice
 *             properties:
 *               orderId:
 *                 type: string
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Order product created
 */

/**
 * @swagger
 * /order-products/{id}:
 *   get:
 *     summary: Get an order product by ID
 *     tags: [OrderProducts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Found
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update an order product
 *     tags: [OrderProducts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Delete an order product
 *     tags: [OrderProducts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 */

router.get(
  "/",
  authenticateJWT,
  authorize("Order-Product Management", "listar"),
  getAllOrderProducts
);

router.get(
  "/:id",
  authenticateJWT,
  authorize("Order-Product Management", "listar"),
  getOrderProductById
);

router.post(
  "/",
  authenticateJWT,
  authorize("Order-Product Management", "crear"),
  createOrderProduct
);

router.put(
  "/:id",
  authenticateJWT,
  authorize("Order-Product Management", "editar"),
  updateOrderProduct
);

router.delete(
  "/:id",
  authenticateJWT,
  authorize("Order-Product Management", "eliminar"),
  deleteOrderProduct
);

module.exports = router;

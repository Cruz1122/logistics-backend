const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderByTrackingCode,
  getCoordsByAddress,
} = require("../controllers/OrderController");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Manage customer orders
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of orders
  *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - status
 *               - deliveryAddress
 *               - totalAmount
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               status:
 *                 type: string
 *                 example: PENDING
 *               deliveryAddress:
 *                 type: string
 *                 example: "Calle 123 #45-67"
 *               estimatedDeliveryTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-01T20:00:00.000Z"
 *               products:
 *                 type: array
 *                 description: List of products to include in the order
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                       example: "uuid-product-1"
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                    
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Bad request – missing or invalid data
 *       403:
 *         description: Forbidden – insufficient permissions
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order found
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update an order
 *     tags: [Orders]
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
 *               id:
 *                type: string
 *               customerId:
 *                 type: string  
 *               deliveryId:
 *                 type: string
 *               status:
 *                 type: string
 *               deliveryAddress:
 *                 type: string
 *               estimatedDeliveryTime:
 *                 type: string
 *                 format: date-time
 *               totalAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Order updated
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order deleted
 */

router.get(
  "/",
  authenticateJWT,
  authorize("Order Management", "listar"),
  getAllOrders
);

router.get(
  "/tracking/:trackingCode",
  getOrderByTrackingCode
);

router.get(
  "/coords/:address",
  getCoordsByAddress
);

router.get(
  "/:id",
  authenticateJWT,
  authorize("Order Management", "listar"),
  getOrderById
);


router.post(
  "/",
  authenticateJWT,
  authorize("Order Management", "crear"),
  createOrder
);

router.put(
  "/:id",
  authenticateJWT,
  authorize("Order Management", "editar"),
  updateOrder
);

router.delete(
  "/:id",
  authenticateJWT,
  authorize("Order Management", "eliminar"),
  deleteOrder
);

module.exports = router;

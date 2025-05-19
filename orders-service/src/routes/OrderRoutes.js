const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - customerId
 *               - status
 *               - deliveryAddress
 *             properties:
 *               id:
 *                 type: string
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
 *       201:
 *         description: Order created
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

router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);

module.exports = router;

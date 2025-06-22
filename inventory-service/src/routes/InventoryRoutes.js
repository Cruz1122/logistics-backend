const express = require("express");
const InventoryController = require("../controllers/InventoryController");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");


/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Service health check
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check if the inventory service is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */


router.get("/health", InventoryController.health);

module.exports = router;
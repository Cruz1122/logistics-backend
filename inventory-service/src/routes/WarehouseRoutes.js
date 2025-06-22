const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const WarehouseController = require("../controllers/WarehouseController");

/**
 * @swagger
 * tags:
 *   name: Warehouse
 *   description: Warehouse management
 */

/**
 * @swagger
 * /warehouse:
 *   get:
 *     summary: Get all warehouses
 *     tags: [Warehouse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of warehouses
 *   post:
 *     summary: Create a new warehouse
 *     tags: [Warehouse]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - city
 *               - state
 *               - postalCode
 *               - latitude
 *               - longitude
 *               - capacityM2
 *               - status
 *               - cityId
 *               - managerId
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               capacityM2:
 *                 type: number
 *               status:
 *                 type: string
 *               cityId:
 *                 type: string
 *               managerId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Warehouse created
 */

/**
 * @swagger
 * /warehouse/{id}:
 *   get:
 *     summary: Get warehouse by ID
 *     tags: [Warehouse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Warehouse found
 *   put:
 *     summary: Update a warehouse
 *     tags: [Warehouse]
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
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               capacityM2:
 *                 type: number
 *               status:
 *                 type: string
 *               cityId:
 *                 type: string
 *               managerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Warehouse updated
 *   delete:
 *     summary: Delete a warehouse
 *     tags: [Warehouse]
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
 *         description: Warehouse deleted
 */


router.get(
  "/",
  authenticateJWT,
  authorize("Warehouse Management", "listar"),
  WarehouseController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Warehouse Management", "listar"),
  WarehouseController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Warehouse Management", "crear"),
  WarehouseController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Warehouse Management", "editar"),
  WarehouseController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Warehouse Management", "eliminar"),
  WarehouseController.remove
);

module.exports = router;
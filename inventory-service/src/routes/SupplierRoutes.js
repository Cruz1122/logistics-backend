const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const SupplierController = require("../controllers/SupplierController");

/**
 * @swagger
 * tags:
 *   name: Supplier
 *   description: Supplier management
 */

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Supplier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of suppliers
 *   post:
 *     summary: Create a new supplier
 *     tags: [Supplier]
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
 *               - phone
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Supplier created
 */

/**
 * @swagger
 * /suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier found
 *   put:
 *     summary: Update a supplier
 *     tags: [Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
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
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplier updated
 *   delete:
 *     summary: Delete a supplier
 *     tags: [Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier deleted
 */

router.get(
  "/",
  authenticateJWT,
  authorize("Supplier Management", "listar"),
  SupplierController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Supplier Management", "listar"),
  SupplierController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Supplier Management", "crear"),
  SupplierController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Supplier Management", "editar"),
  SupplierController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Supplier Management", "eliminar"),
  SupplierController.remove
);

module.exports = router;
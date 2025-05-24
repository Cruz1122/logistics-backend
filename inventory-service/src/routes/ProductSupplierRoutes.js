const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const ProductSupplierController = require("../controllers/ProductSupplierController");

/**
 * @swagger
 * tags:
 *   name: Product-Supplier
 *   description: Management of product and supplier associations
 */

/**
 * @swagger
 * /product-supplier:
 *   get:
 *     summary: Get all product-supplier relations
 *     tags: [Product-Supplier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of product-supplier relations
 *   post:
 *     summary: Create a product-supplier relation
 *     tags: [Product-Supplier]
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
 *               - supplierId
 *             properties:
 *               productId:
 *                 type: string
 *               supplierId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Relation created
 */

/**
 * @swagger
 * /product-supplier/{id}:
 *   get:
 *     summary: Get a product-supplier relation by ID
 *     tags: [Product-Supplier]
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
 *         description: Relation found
 *   put:
 *     summary: Update a product-supplier relation
 *     tags: [Product-Supplier]
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
 *               productId:
 *                 type: string
 *               supplierId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Relation updated
 *   delete:
 *     summary: Delete a product-supplier relation
 *     tags: [Product-Supplier]
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
 *         description: Relation deleted
 */


router.get(
  "/",
  authenticateJWT,
  authorize("Product-Supplier Management", "listar"),
  ProductSupplierController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Product-Supplier Management", "listar"),
  ProductSupplierController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Product-Supplier Management", "crear"),
  ProductSupplierController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Product-Supplier Management", "editar"),
  ProductSupplierController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Product-Supplier Management", "eliminar"),
  ProductSupplierController.remove
);

module.exports = router;

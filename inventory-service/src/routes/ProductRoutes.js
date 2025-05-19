const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const ProductController = require("../controllers/ProductController");


/**
 * @swagger
 * tags:
 *   name: Product
 *   description: Product management
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create a new product
 *     tags: [Product]
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
 *               - description
 *               - sku
 *               - barcode
 *               - unitPrice
 *               - weightKg
 *               - dimensions
 *               - isFragile
 *               - needsCooling
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               unitPrice:
 *                 type: number
 *               weightKg:
 *                 type: number
 *               dimensions:
 *                 type: string
 *               isFragile:
 *                 type: boolean
 *               needsCooling:
 *                 type: boolean
 *               categoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created
 */

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Product]
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
 *         description: Product found
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a product
 *     tags: [Product]
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
 *               description:
 *                 type: string
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               unitPrice:
 *                 type: number
 *               weightKg:
 *                 type: number
 *               dimensions:
 *                 type: string
 *               isFragile:
 *                 type: boolean
 *               needsCooling:
 *                 type: boolean
 *               categoryId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete a product
 *     tags: [Product]
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
 *         description: Product deleted
 */


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

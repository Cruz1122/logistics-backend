const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const CategoryController = require("../controllers/CategoryController");


/**
 * @swagger
 * tags:
 *   name: category
 *   description: Category management
 */

/**
 * @swagger
 * /category:
 *   get:
 *     summary: Get all categories
 *     tags: [category]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *
 *   post:
 *     summary: Create a new category
 *     tags: [category]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 */

/**
 * @swagger
 * /category/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [category]
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
 *         description: Category found
 *       404:
 *         description: Not found
 *
 *   put:
 *     summary: Update a category
 *     tags: [category]
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
 *     responses:
 *       200:
 *         description: Category updated
 *
 *   delete:
 *     summary: Delete a category
 *     tags: [category]
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
 *         description: Category deleted
 */


router.get(
  "/",
  authenticateJWT,
  authorize("Category Management", "listar"),
  CategoryController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("Category Management", "listar"),
  CategoryController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("Category Management", "crear"),
  CategoryController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("Category Management", "editar"),
  CategoryController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Category Management", "eliminar"),
  CategoryController.remove
);

module.exports = router;
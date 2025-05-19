const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const CityController = require("../controllers/CityController");


/**
 * @swagger
 * tags:
 *   name: City
 *   description: City management
 */

/**
 * @swagger
 * /cities:
 *   get:
 *     summary: Get all cities
 *     tags: [City]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cities
 *   post:
 *     summary: Create a new city
 *     tags: [City]
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
 *               - stateId
 *             properties:
 *               name:
 *                 type: string
 *               stateId:
 *                 type: string
 *     responses:
 *       201:
 *         description: City created
 */

/**
 * @swagger
 * /cities/{id}:
 *   get:
 *     summary: Get city by ID
 *     tags: [City]
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
 *         description: City found
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a city
 *     tags: [City]
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
 *               stateId:
 *                 type: string
 *     responses:
 *       200:
 *         description: City updated
 *   delete:
 *     summary: Delete a city
 *     tags: [City]
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
 *         description: City deleted
 */


router.get(
  "/",
  authenticateJWT,
  authorize("City Management", "listar"),
  CityController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("City Management", "listar"),
  CityController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("City Management", "crear"),
  CityController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("City Management", "editar"),
  CityController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("City Management", "eliminar"),
  CityController.remove
);

module.exports = router;
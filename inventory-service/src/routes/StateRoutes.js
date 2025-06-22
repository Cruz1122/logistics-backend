const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const StateController = require("../controllers/StateController");


/**
 * @swagger
 * tags:
 *   name: State
 *   description: State (department) management
 */

/**
 * @swagger
 * /state:
 *   get:
 *     summary: Get all states
 *     tags: [State]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of states
 *   post:
 *     summary: Create a new state
 *     tags: [State]
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
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: State created
 */

/**
 * @swagger
 * /state/{id}:
 *   get:
 *     summary: Get state by ID
 *     tags: [State]
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
 *         description: State found
 *   put:
 *     summary: Update a state
 *     tags: [State]
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
 *         description: State updated
 *   delete:
 *     summary: Delete a state
 *     tags: [State]
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
 *         description: State deleted
 */


router.get(
  "/",
  authenticateJWT,
  authorize("State Management", "listar"),
  StateController.getAll
);
router.get(
  "/:id",
  authenticateJWT,
  authorize("State Management", "listar"),
  StateController.getById
);
router.post(
  "/",
  authenticateJWT,
  authorize("State Management", "crear"),
  StateController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorize("State Management", "editar"),
  StateController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorize("State Management", "eliminar"),
  StateController.remove
);

module.exports = router;
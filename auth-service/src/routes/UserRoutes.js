const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const {
  getAllUsers,
  getUserById,
  getUserStatusById,
  updateUser,
  deleteUser,
  createUser,
  getUserByEmail,
  bulkUsers
} = require("../controllers/UserController");

/**
 * @swagger
 * /users/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     responses:
 *       200:
 *         description: List of users
 */
router.get(
  "/users",
  authenticateJWT,
  authorize("User Management", "listar"),
  getAllUsers
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get(
  "/:id",
  authenticateJWT,
  authorize("User Management", "listar"),
  getUserById
);

router.get("/status/:id", getUserStatusById);

router.get(
  "/email/:email",
  authenticateJWT,
  authorize("User Management", "listar"),
  getUserByEmail
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
router.put(
  "/:id",
  authenticateJWT,
  authorize("User Management", "editar"),
  updateUser
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete(
  "/:id",
  authenticateJWT,
  authorize("User Management", "eliminar"),
  deleteUser
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - lastName
 *               - phone
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Invalid input
 */
router.post(
  "/",
  authenticateJWT,
  authorize("User Management", "crear"),
  createUser
);

router.post(
  "/bulk",
  authenticateJWT,
  authorize("User Management", "crear"),
  bulkUsers
);

module.exports = router;

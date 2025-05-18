const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const {
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  createRole,
} = require("../controllers/RoleController");

/**
 * @swagger
 * /roles/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get(
  "/roles",
  authenticateJWT,
  authorize("Role Management", "listar"),
  getRoles
);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the role to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role found
 *       404:
 *         description: Role not found
 */
router.get(
  "/:id",
  authenticateJWT,
  authorize("Role Management", "listar"),
  getRoleById
);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Replace role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the role to update
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role updated
 *       404:
 *         description: Role not found
 */
router.put(
  "/:id",
  authenticateJWT,
  authorize("Role Management", "editar"),
  updateRole
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Delete role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     description: Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the role to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted
 */
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Role Management", "eliminar"),
  deleteRole
);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created
 *       400:
 *         description: Invalid input
 */
router.post(
  "/",
  authenticateJWT,
  authorize("Role Management", "crear"),
  createRole
);

module.exports = router;

const express = require("express");
const router = express.Router();
const authorizeRoles = require("../middlewares/Auth");
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
router.get("/roles", authorizeRoles("admin"), getRoles);

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
router.get("/:id", authorizeRoles("admin"), getRoleById);

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
router.put("/:id", authorizeRoles("admin"), updateRole);

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
router.delete("/:id", authorizeRoles("admin"), deleteRole);

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
router.post("/", authorizeRoles("admin"), createRole);

module.exports = router;

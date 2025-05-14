const express = require("express");
const router = express.Router();
const authorizeRoles = require("../middlewares/Auth");
const {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
} = require("../controllers/PermissionController");

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Retrieve all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     description: Fetch a list of all permissions. Roles allowed are admin, manager.
 *     responses:
 *       200:
 *         description: List of permissions retrieved successfully
 */
router.get(
  "/permissions",
  authorizeRoles("admin", "manager"),
  getAllPermissions
);

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: Retrieve a permission by ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     description: Fetch a specific permission by its ID. Roles allowed are admin, manager.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the permission to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission retrieved successfully
 *       404:
 *         description: Permission not found
 */
router.get("/:id", authorizeRoles("admin", "manager"), getPermissionById);

/**
 * @swagger
 * /permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     description: Add a new permission to the system. Role allowed is admin.
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
 *                 example: "CREATE_USER"
 *               description:
 *                 type: string
 *                 example: "Allows creating new users"
 *     responses:
 *       201:
 *         description: Permission created successfully
 *       400:
 *         description: Invalid input
 */
router.post("/", authorizeRoles("admin"), createPermission);

/**
 * @swagger
 * /permissions/{id}:
 *   put:
 *     summary: Update a permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     description: Update the details of an existing permission. Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the permission to update
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
 *                 example: "EDIT_USER"
 *               description:
 *                 type: string
 *                 example: "Allows editing user details"
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       404:
 *         description: Permission not found
 */
router.put("/:id", authorizeRoles("admin"), updatePermission);

/**
 * @swagger
 * /permissions/{id}:
 *   delete:
 *     summary: Delete a permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     description: Remove a permission from the system. Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the permission to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       404:
 *         description: Permission not found
 */
router.delete("/:id", authorizeRoles("admin"), deletePermission);

module.exports = router;

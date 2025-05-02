const express = require("express");
const router = express.Router();
const {
  getAllRolePermissions,
  createRolePermission,
  getRolePermissionById,
  updateRolePermission,
  deleteRolePermission,
} = require("../controllers/RolePermissionController");

// Ruta base: /role-permissions

/**
 * @swagger
 * /role-permissions/role-permissions:
 *   get:
 *     summary: Get all permissions assigned to a role
 *     tags: [RolePermissions]
 *     responses:
 *       200:
 *         description: Role permissions list
 *       404:
 *         description: Role not found
*/
router.get("/role-permissions", getAllRolePermissions);

/**
 * @swagger
 * /role-permissions/{id}:
 *   get:
 *     summary: Get role-permission by ID
 *     tags: [RolePermissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role-permission found
 *       404:
 *         description: Role-permission not found
 */
router.get("/:id", getRolePermissionById);

/**
 * @swagger
 * /role-permissions:
 *   post:
 *     summary: Assign a permission to a role
 *     tags: [RolePermissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *               - permissionId
 *             properties:
 *               roleId:
 *                 type: string
 *               permissionId:
 *                 type: string
 *               listar:
 *                 type: boolean
 *               eliminar:
 *                 type: boolean
 *               crear:
 *                 type: boolean
 *               editar:
 *                 type: boolean
 *               descargar:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Role permission assigned
 */ 
router.post("/", createRolePermission);

/** 
 * @swagger
 * /role-permissions/{id}:
 *   put:
 *     summary: Update role permission flags
 *     tags: 
 *       - RolePermissions
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the role-permission relation to update
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               listar:
 *                 type: boolean
 *                 description: Flag to allow listing
 *               eliminar:
 *                 type: boolean
 *                 description: Flag to allow deletion
 *               crear:
 *                 type: boolean
 *                 description: Flag to allow creation
 *               editar:
 *                 type: boolean
 *                 description: Flag to allow editing
 *               descargar:
 *                 type: boolean
 *                 description: Flag to allow downloading
 *     responses:
 *       200:
 *         description: Role permission updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Role-permission relation not found
*/
router.put("/:id", updateRolePermission);

/** 
 * @swagger
 * /role-permissions/{id}:
 *   delete:
 *     summary: Delete a role-permission relation
 *     tags: 
 *       - RolePermissions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role permission deleted
 *       404:
 *         description: Role-permission not found
*/
router.delete("/:id", deleteRolePermission);

module.exports = router;

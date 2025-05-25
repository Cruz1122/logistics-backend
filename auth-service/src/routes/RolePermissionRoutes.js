const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const {
  getAllRolePermissions,
  createRolePermission,
  getRolePermissionById,
  updateRolePermission,
  deleteRolePermission,
} = require("../controllers/RolePermissionController");

// auth-service (Express)
router.get("/check", authenticateJWT, async (req, res) => {
  const { roleId, permissionName, action } = req.query;
  if (!roleId || !permissionName || !action) {
    return res.status(400).json({ error: "Parámetros incompletos" });
  }
  try {
    const rp = await prisma.rolePermission.findFirst({
      where: { roleId, permission: { name: permissionName } },
      select: { [action]: true },
    });
    return res.json({ allowed: !!rp?.[action] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno" });
  }
});


// Ruta base: /role-permissions

/**
 * @swagger
 * /role-permissions:
 *   get:
 *     summary: Retrieve all role-permission relations
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     description: Fetch a list of all role-permission relations. Role allowed is admin.
 *     responses:
 *       200:
 *         description: List of role-permission relations retrieved successfully
 */
router.get(
  "/role-permissions",
  authenticateJWT,
  authorize("Role-Permission Management", "listar"),
  getAllRolePermissions
);

/**
 * @swagger
 * /role-permissions/{id}:
 *   get:
 *     summary: Retrieve a role-permission relation by ID
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     description: Fetch a specific role-permission relation by its ID. Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the role-permission relation to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role-permission relation retrieved successfully
 *       404:
 *         description: Role-permission relation not found
 */
router.get(
  "/:id",
  authenticateJWT,
  authorize("Role-Permission Management", "listar"),
  getRolePermissionById
);

/**
 * @swagger
 * /role-permissions:
 *   post:
 *     summary: Create a new role-permission relation
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     description: Add a new role-permission relation to the system. Role allowed is admin.
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
 *                 example: "role123"
 *               permissionId:
 *                 type: string
 *                 example: "perm456"
 *               listar:
 *                 type: boolean
 *                 example: true
 *               eliminar:
 *                 type: boolean
 *                 example: false
 *               crear:
 *                 type: boolean
 *                 example: true
 *               editar:
 *                 type: boolean
 *                 example: false
 *               descargar:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Role-permission relation created successfully
 *       400:
 *         description: Invalid input
 */
router.post(
  "/",
  authenticateJWT,
  authorize("Role-Permission Management", "crear"),
  createRolePermission
);

/**
 * @swagger
 * /role-permissions/{id}:
 *   put:
 *     summary: Update a role-permission relation
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     description: Update the details of an existing role-permission relation. Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the role-permission relation to update
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
 *                 example: true
 *               eliminar:
 *                 type: boolean
 *                 example: false
 *               crear:
 *                 type: boolean
 *                 example: true
 *               editar:
 *                 type: boolean
 *                 example: false
 *               descargar:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Role-permission relation updated successfully
 *       404:
 *         description: Role-permission relation not found
 */
router.put(
  "/:id",
  authenticateJWT,
  authorize("Role-Permission Management", "editar"),
  updateRolePermission
);

/**
 * @swagger
 * /role-permissions/{id}:
 *   delete:
 *     summary: Delete a role-permission relation
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     description: Remove a role-permission relation from the system. Role allowed is admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the role-permission relation to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role-permission relation deleted successfully
 *       404:
 *         description: Role-permission relation not found
 */
router.delete(
  "/:id",
  authenticateJWT,
  authorize("Role-Permission Management", "eliminar"),
  deleteRolePermission
);


module.exports = router;

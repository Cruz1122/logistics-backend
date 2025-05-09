const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
} = require("../controllers/PermissionController");

// Ruta base: /permissions

/**
 * @swagger
 * /permissions/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get("/permissions", authenticate(),getAllPermissions);

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: Get permission by ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission found
 *       404:
 *         description: Permission not found
*/
router.get("/:id", authenticate(),getPermissionById);


/**
 * @swagger
 * /permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created
 *       400:
 *         description: Invalid input
*/
router.post("/", authenticate(),createPermission);


/**
 * @swagger
 * /permissions/{id}:
 *   put:
 *     summary: Replace a permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permission updated
 *       404:
 *         description: Permission not found
 */
router.put("/:id", authenticate(),updatePermission);

/**  
 * @swagger
 * /permissions/{id}:
 *   delete:
 *     summary: Delete a permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission deleted
 */
router.delete("/:id", authenticate(),deletePermission);

module.exports = router;

const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const {
    getRoles,
    getRoleById,
    updateRole,
    deleteRole,
    createRole,

} = require("../controllers/RoleController");

/**
 * @swagger
 *  /roles/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get("/roles", authenticate(),getRoles);

/**
 *  @swagger
 *  /roles/{id}:
 *    get:
 *     summary: Get role by ID
 *     tags: [Roles]
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
 *         description: Role found
 *       404:
 *         description: Role not found
 */
router.get("/:id", authenticate(),getRoleById);

/**
 * @swagger
 *  /roles/{id}:
 *   put:
 *     summary: Replace role
 *     tags: [Roles]
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
 *         description: Role updated
 *       404:
 *         description: Role not found
 */
router.put("/:id", authenticate(),updateRole);


/**
 *  @swagger
 *   /roles/{id}:
 *    delete:
 *     summary: Delete role
 *     tags: [Roles]
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
 *         description: Role deleted
 */
router.delete("/:id", authenticate(),deleteRole);

/** 
 *  @swagger
 *  /roles:
 *    post:
 *     summary: Create a new role
 *     tags: [Roles]
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
 *         description: Role created
 *       400:
 *         description: Invalid input
 */
router.post("/", authenticate(),createRole);


module.exports = router;

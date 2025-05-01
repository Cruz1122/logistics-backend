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
router.get("/role-permissions", getAllRolePermissions);
router.get("/:id", getRolePermissionById);
router.post("/", createRolePermission);
router.put("/:id", updateRolePermission);
router.delete("/:id", deleteRolePermission);

module.exports = router;

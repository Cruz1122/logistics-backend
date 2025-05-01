const express = require("express");
const router = express.Router();
const {
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  createRole,

} = require("../controllers/RoleController");

router.get("/roles", getRoles);
router.get("/:id", getRoleById);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);
router.post("/", createRole);


module.exports = router;

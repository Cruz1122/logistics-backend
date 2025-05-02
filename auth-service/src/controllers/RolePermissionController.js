const prisma = require("../config/prisma");

const getAllRolePermissions = async (req, res) => {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        role: true,
        permission: true,
      },
    });
    res.json(rolePermissions);
  } catch (error) {
    console.error("Error fetching role-permissions:", error);
    res.status(500).json({ error: "Failed to fetch role-permissions" });
  }
};

const createRolePermission = async (req, res) => {
  const { roleId, permissionId, listar, eliminar, crear, editar, descargar } =
    req.body;

  if (!roleId || !permissionId) {
    return res
      .status(400)
      .json({ error: "roleId and permissionId are required." });
  }

  try {
    // Verifica que el rol exista
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res
        .status(400)
        .json({ error: "Invalid roleId. Role does not exist." });
    }

    // Verifica que el permiso exista
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      return res
        .status(400)
        .json({ error: "Invalid permissionId. Permission does not exist." });
    }

    // Crea la relación
    const newRelation = await prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
        listar: !!listar,
        eliminar: !!eliminar,
        crear: !!crear,
        editar: !!editar,
        descargar: !!descargar,
      },
    });

    res.status(201).json({
      message: "Role-permission relation created successfully.",
      rolePermission: newRelation,
    });
  } catch (error) {
    console.error("Error creating role-permission:", error);
    res.status(500).json({ error: "Failed to create role-permission." });
  }
};

const getRolePermissionById = async (req, res) => {
  const { id } = req.params; 

  try {
    const rolePermission = await prisma.rolePermission.findUnique({
      where: { id }, 
      include: {
        permission: true,
        role: true,
      },
    });

    if (!rolePermission) {
      return res.status(404).json({ error: "Role permission not found" });
    }

    res.json(rolePermission);
  } catch (error) {
    console.error("Error fetching role permission:", error);
    res.status(500).json({ error: "Failed to fetch role permission." });
  }
};

const updateRolePermission = async (req, res) => {
  const id = req.params.id;
  const { roleId, permissionId, listar, eliminar, crear, editar, descargar } =
    req.body;

  try {
    // Verifica que exista el RolePermission que se va a actualizar
    const existing = await prisma.rolePermission.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "RolePermission not found." });
    }

    // Validar que el nuevo roleId exista
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res
        .status(400)
        .json({ error: "Invalid roleId. Role does not exist." });
    }

    // Validar que el nuevo permissionId exista
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      return res
        .status(400)
        .json({ error: "Invalid permissionId. Permission does not exist." });
    }

    // Actualizar el RolePermission
    const updated = await prisma.rolePermission.update({
      where: { id },
      data: {
        roleId,
        permissionId,
        listar: !!listar,
        eliminar: !!eliminar,
        crear: !!crear,
        editar: !!editar,
        descargar: !!descargar,
      },
    });

    res.json({
      message: "Role-permission relation updated successfully.",
      rolePermission: updated,
    });
  } catch (error) {
    console.error("Error updating role-permission:", error);
    res.status(500).json({ error: "Failed to update role-permission." });
  }
};

const deleteRolePermission = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.rolePermission.delete({ where: { id } });
    res.json({ message: "Role-permission relation deleted successfully." });
  } catch (error) {
    console.error("Error deleting role-permission:", error);
    res.status(500).json({ error: "Failed to delete role-permission." });
  }
};

module.exports = {
  getAllRolePermissions,
  createRolePermission,
  getRolePermissionById,
  updateRolePermission,
  deleteRolePermission,
};

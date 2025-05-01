const prisma = require("../config/prisma");

const getAllPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany();
    res.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
};

const getPermissionById = async (req, res) => {
  const permissionId = req.params.id;
  try {
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    res.json(permission);
  } catch (error) {
    console.error("Error fetching permission:", error);
    res.status(500).json({ error: "Failed to fetch permission" });
  }
};

const createPermission = async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }

  try {
    const existing = await prisma.permission.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({ error: "Permission name already exists." });
    }

    const newPermission = await prisma.permission.create({
      data: { name, description },
    });

    res.status(201).json({
      message: "Permission created successfully.",
      permission: newPermission,
    });
  } catch (error) {
    console.error("Error creating permission:", error);
    res.status(500).json({ error: "Failed to create permission." });
  }
};

const updatePermission = async (req, res) => {
  const permissionId = req.params.id;
  const { name, description } = req.body;

  try {
    const updated = await prisma.permission.update({
      where: { id: permissionId },
      data: { name, description },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating permission:", error);
    res.status(500).json({ error: "Failed to update permission" });
  }
};

const deletePermission = async (req, res) => {
  const permissionId = req.params.id;
  try {
    await prisma.permission.delete({ where: { id: permissionId } });
    res.json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting permission:", error);
    res.status(500).json({ error: "Failed to delete permission" });
  }
};

module.exports = {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
};

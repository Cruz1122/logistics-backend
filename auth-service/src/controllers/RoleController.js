const prisma = require("../config/prisma");

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ include: { permissions: true } });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

const getRoleById = async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: true },
    });
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch role" });
  }
};

const updateRole = async (req, res) => {
  const { name, description } = req.body;
  try {
    const updated = await prisma.role.update({
      where: { id: req.params.id },
      data: { name, description },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update role" });
  }
};

const deleteRole = async (req, res) => {
  try {
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ message: "Role deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete role" });
  }
};

const createRole = async (req, res) => {
    const { name, description } = req.body;
    try {
      const role = await prisma.role.create({ data: { name, description } });
      res.status(201).json(role);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create role" });
    }
  };

module.exports = {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
};

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createRole = async (req, res) => {
  const { name, description } = req.body;
  try {
    const role = await prisma.role.create({
      data: { name, description },
    });
    res.json(role);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ error: "Failed to create role" });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany();
    res.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

module.exports = {
  createRole,
  getAllRoles,
};

const prisma = require("../config/prisma");
const axios = require("axios");

/**
 * Retrieves all roles from the database, including their permissions.
 */
const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ include: { permissions: true } });
    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

/**
 * Retrieves a specific role by its ID, including its permissions.
 */
const getRoleById = async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: true },
    });
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json(role);
  } catch (err) {
    console.error("Error fetching role:", err);
    res.status(500).json({ error: "Failed to fetch role" });
  }
};

/**
 * Retrieves a role by its name.
 */
const getRoleByName = async (req, res) => {
  const { name } = req.params;
  try {
    const role = await prisma.role.findFirst({
      where: { name },
    });
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json(role.id ? role : { message: "Role not found" });
  } catch (err) {
    console.error("Error fetching role by name:", err);
    res.status(500).json({ error: "Failed to fetch role by name" });
  }
};

/**
 * Updates the name and description of a role by its ID.
 */
const updateRole = async (req, res) => {
  const { name, description } = req.body;
  try {
    const updated = await prisma.role.update({
      where: { id: req.params.id },
      data: { name, description },
    });
    res.json(updated);
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
};

/**
 * Deletes a role by its ID.
 */
const deleteRole = async (req, res) => {
  try {
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ message: "Role deleted" });
  } catch (err) {
    console.error("Error deleting role:", err);
    res.status(500).json({ error: "Failed to delete role" });
  }
};

/**
 * Creates a new role and assigns all permissions to it with all actions set to false.
 */
const createRole = async (req, res) => {
  const { name, description } = req.body;
  try {
    // 1. Create the role
    const role = await prisma.role.create({ data: { name, description } });

    // 2. Get all permissions
    const permissions = await prisma.permission.findMany();

    // 3. Create role-permission relations with all actions set to false
    const rolePermissionEndpoint = `${process.env.GATEWAY_INTERNAL_URL}/auth/role-permissions/`;

    // Take the Authorization header from the request
    const authHeader = req.headers.authorization;

    await Promise.all(
      permissions.map((perm) =>
        axios.post(
          rolePermissionEndpoint,
          {
            roleId: role.id,
            permissionId: perm.id,
            listar: false,
            eliminar: false,
            crear: false,
            editar: false,
            descargar: false,
          },
          {
            headers: {
              Authorization: authHeader,
            },
          }
        )
      )
    );

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
  getRoleByName
};
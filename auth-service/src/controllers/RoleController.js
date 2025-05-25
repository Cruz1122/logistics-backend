const prisma = require("../config/prisma");
const axios = require("axios");

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ include: { permissions: true } });
    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
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
    console.error("Error fetching role:", err);
    res.status(500).json({ error: "Failed to fetch role" });
  }
};

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

const deleteRole = async (req, res) => {
  try {
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ message: "Role deleted" });
  } catch (err) {
    console.error("Error deleting role:", err);
    res.status(500).json({ error: "Failed to delete role" });
  }
};

const createRole = async (req, res) => {
  const { name, description } = req.body;
  try {
    // 1. Crear el rol
    const role = await prisma.role.create({ data: { name, description } });

    // 2. Obtener todos los permisos
    const permissions = await prisma.permission.findMany();

    // 3. Crear las relaciones role-permission con todas las acciones en false
    const rolePermissionEndpoint = `${process.env.GATEWAY_INTERNAL_URL}/auth/role-permissions/`;

    // Toma el header Authorization recibido
    const authHeader = req.headers.authorization;

    console.log("Authorization Header:", authHeader);
    console.log("Role Permission Endpoint:", rolePermissionEndpoint);
    console.log("Role ID:", role.id);
    console.log("Permissions:", permissions);

    

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

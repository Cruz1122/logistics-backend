const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

const getUserById = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
      
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

const updateUser = async (req, res) => {
  const userId = req.params.id;
  const { name, lastName, phone, roleId } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        lastName,
        phone,
        roleId,
        updatedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.params.id;
  try {
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

const createUser = async (req, res) => {
  const { email, password, name, lastName, phone, roleId } = req.body;

  if (!email || !password || !name || !lastName || !phone || !roleId) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Verificar que el correo no exista
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use." });
    }

    // Verificar que el rol exista
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(400).json({ error: "Invalid roleId." });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        lastName,
        phone,
        roleId,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.status(201).json({
      message: "User created successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        lastName: newUser.lastName,
        phone: newUser.phone,
        roleId: newUser.roleId,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user." });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser
};

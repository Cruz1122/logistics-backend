const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const axios = require("axios");
const { get } = require("../routes/AuthRoutes");

const capitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ") // Divide la cadena en palabras
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitaliza cada palabra
    .join(" "); // Une las palabras nuevamente
};

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
      },
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
      include: { role: true },
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

const getUserByEmail = async (req, res) => {
  const email = req.params.email;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
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
  const { name, lastName, phone, roleId, cityId } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        lastName,
        phone,
        roleId,
        updatedAt: new Date(),
        cityId: cityId || null, // Asignar cityId si se proporciona
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
  const { email, password, name, lastName, phone, roleId, cityId } = req.body;

  if (!email || !password || !name || !lastName || !phone || !roleId) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(400).json({ error: "Invalid roleId." });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    const capitalizedName = capitalize(name);
    const capitalizedLastName = capitalize(lastName);

    // Crear el usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: capitalizedName,
        lastName: capitalizedLastName,
        phone,
        roleId,
        emailVerified: true, //Creado por el admin
        createdAt: new Date(),
        updatedAt: new Date(),
        cityId: cityId || null, // Asignar cityId si se proporciona
      },
    });

    // Si el rol es "delivery", crear DeliveryPerson en microservicio orders
    if (role.name.toLowerCase() === "delivery") {
      if (!cityId) {        
        return res.status(400).json({
          error: "cityId is required for delivery role.",
        });
      }

      try {
        await axios.post(
          `${process.env.ORDERS_URL}/delivery-persons`,
          {
            idUser: newUser.id,
            name: `${capitalizedName} ${capitalizedLastName}`,
            latitude: null,
            longitude: null,
          },
          {
            headers: {
              Authorization: req.headers.authorization,
            },
          }
        );
      } catch (error) {
        console.error("Error creating DeliveryPerson:", error.message);
        
        await prisma.user.delete({
          where: { id: newUser.id },
        });

        return res.status(500).json({
          error: "Failed to create DeliveryPerson in orders service.",
        });
      }
    }

    res.status(201).json({
      message: "User created successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        lastName: newUser.lastName,
        phone: newUser.phone,
        roleId: newUser.roleId,
        cityId: newUser.cityId,
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
  createUser,
  getUserByEmail,
};
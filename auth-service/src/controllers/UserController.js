const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const axios = require("axios");
const { get } = require("../routes/AuthRoutes");

// Capitalizes the first letter of each word in a string
const capitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Validates and prepares user data for bulk creation
function validateUserData(user) {
  if (!user.email || !user.password || !user.name || !user.roleId) {
    throw new Error("Missing required fields: email, password, name, roleId");
  }
}

/**
 * Retrieves all users from the database, including their roles.
 */
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

/**
 * Retrieves a user by their ID, including their role.
 */
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

/**
 * Retrieves a user by their email, including their role.
 */
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

/**
 * Retrieves the active status of a user by their ID.
 */
const getUserStatusById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({ isActive: user.isActive });
  } catch (error) {
    console.error("Error fetching user status:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Updates a user's information by their ID.
 */
const updateUser = async (req, res) => {
  const userId = req.params.id;
  const { name, lastName, phone, roleId, cityId, isActive } = req.body;
  if (!name || !lastName || !phone || !roleId) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        lastName,
        phone,
        roleId,
        isActive,
        updatedAt: new Date(),
        cityId, // Ensures cityId is updated correctly
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

/**
 * Deletes a user by their ID.
 */
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

/**
 * Creates a new user, hashes the password, and assigns a role.
 * If the role is "delivery", also creates a DeliveryPerson in the orders microservice.
 */
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const capitalizedName = capitalize(name);
    const capitalizedLastName = capitalize(lastName);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: capitalizedName,
        lastName: capitalizedLastName,
        phone,
        roleId,
        emailVerified: true,
        isActive, 
        createdAt: new Date(),
        updatedAt: new Date(),
        cityId: cityId || null, // Assign cityId if provided
      },
    });

    // If the role is "delivery", create DeliveryPerson in orders microservice
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

/**
 * Creates multiple users in bulk, hashing passwords and validating data.
 */
const bulkUsers = async (req, res) => {
  const users = req.body;

  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: "You must send a non-empty array of users." });
  }

  try {
    // Validate all user data before processing
    for (const user of users) {
      validateUserData(user);
    }

    // Prepare users for creation: hash passwords and clean data
    const usersData = await Promise.all(
      users.map(async (user) => ({
        email: user.email.toLowerCase(),
        password: await bcrypt.hash(user.password, 10),
        name: user.name.trim(),
        lastName: user.lastName?.trim() || "",
        phone: user.phone || "",
        roleId: user.roleId,
      }))
    );

    // Bulk insert with createMany
    // Note: createMany does not trigger hooks or validate uniqueness, use skipDuplicates:true to ignore repeated emails
    await prisma.user.createMany({
      data: usersData,
      skipDuplicates: true,
    });

    res.status(201).json({ message: "Users created in bulk" });
  } catch (error) {
    console.error("Error in bulk user creation:", error);
    res.status(500).json({ error: "Error creating users in bulk" });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserStatusById,
  updateUser,
  deleteUser,
  createUser,
  getUserByEmail,
  bulkUsers
};
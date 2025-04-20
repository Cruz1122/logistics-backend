const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const signUp = async (req, res) => {
  const { email, password, name, lastName ,phone, roleId} = req.body;
  console.log("Entró");
  
  try {
    // Verifica si el email ya está en uso
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Verifica si el roleId existe
    const roleExists = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!roleExists) {
      return res.status(400).json({ error: `Invalid roleId: ${roleId}` });
    }

    // Hashea la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea el usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        lastName,
        phone,
        roleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
};

// app.post("/roles", async (req, res) => {
//   const { name, description } = req.body;
//   try {
//     const role = await prisma.Role.create({
//       data: { name, description },
//     });
//     res.json(role);
//   } catch (error) {
//     console.error("Error creating role:", error); // Log the error details
//     res.status(500).json({ error: "Failed to create role" });
//   }
// });

// app.get("/roles", async (req, res) => {
//   const roles = await prisma.Role.findMany();
//   res.json(roles);
// });

// app.get("/users", async (req, res) => {
//     const users = await prisma.User.findMany();
//     res.json(users);
//   });

const health = async (req, res) => {
  try {
    res.status(200).send("OK");
  } catch (err) {
    console.error("Health check failed:", err); // Log the error details
    res.status(500).send("Unhealthy");
  }
}



module.exports = {
  signUp,
  health
};
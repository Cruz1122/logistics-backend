const express = require("express");

const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.AUTH_PORT || 4001;
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    res.status(200).send("OK");
  } catch (err) {
    console.error("Health check failed:", err); // Log the error details
    res.status(500).send("Unhealthy");
  }
});

app.post("/roles", async (req, res) => {
  const { name, description } = req.body;
  try {
    const role = await prisma.Role.create({
      data: { name, description },
    });
    res.json(role);
  } catch (error) {
    console.error("Error creating role:", error); // Log the error details
    res.status(500).json({ error: "Failed to create role" });
  }
})

app.get("/roles", async (req, res) => {
  const roles = await prisma.Role.findMany();
  res.json(roles);
});

app.get("/users", async (req, res) => {
    const users = await prisma.User.findMany();
    res.json(users);
  });
  

app.listen(PORT, () => console.log(`Auth Service on port ${PORT}`));
console.log("DATABASE_URL:", process.env.DATABASE_URL);
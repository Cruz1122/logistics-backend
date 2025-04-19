const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.get("/health", async (req, res) => {
  try {
    res.status(200).send("OK");
  } catch (err) {
    console.error("Health check failed:", err); // Log the error details
    res.status(500).send("Unhealthy");
  }
});

app.get("/users", async (req, res) => {
    const users = await prisma.User.findMany();
    res.json(users);
  });
  
app.listen(4001, () => console.log("Auth Service on port 4001"));
console.log("DATABASE_URL:", process.env.DATABASE_URL);
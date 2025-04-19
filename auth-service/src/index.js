const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.get("/health", async (_, res) => {
  try {
    // Realiza una consulta básica para verificar la conexión
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send("Auth Service OK - Database Connected");
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).send("Auth Service OK - Database Connection Failed");
  }
});

app.get("/users", async (req, res) => {
    const users = await prisma.User.findMany();
    res.json(users);
  });
  
app.listen(4001, () => console.log("Auth Service on port 4001"));
console.log("DATABASE_URL:", process.env.DATABASE_URL);
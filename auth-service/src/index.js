const express = require("express");
const app = express();
const PORT = process.env.PORT || 4001;

const authRoutes = require("./routes/authroutes");
const roleRoutes = require("./routes/roleroutes");

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/roles", roleRoutes);

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // Verifica conexión DB
    res.status(200).send("OK");
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(500).send("Unhealthy");
  }
});
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});


app.listen(PORT, () => console.log(`Auth Service on port ${PORT}`));

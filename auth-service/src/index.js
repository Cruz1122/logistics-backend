const express = require("express");
const authRoutes = require("./routes/AuthRoutes");
const userRoutes = require("./routes/UserRoutes");
const validateGateway = require("./middlewares/validateGateway");

const app = express();
const PORT = process.env.AUTH_PORT;

app.use(express.json());
app.use("/users", userRoutes);
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});

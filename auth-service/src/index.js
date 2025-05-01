const express = require("express");
const authRoutes = require("./routes/AuthRoutes");
const userRoutes = require("./routes/UserRoutes");
const roleRoutes = require("./routes/RoleRoutes");
const permissionRoutes = require("./routes/PermissionRoutes");
const rolePermissionRoutes = require("./routes/RolePermissionRoutes");

const app = express();
const PORT = process.env.AUTH_PORT;

app.use(express.json());
app.use("/users", userRoutes);
app.use("/roles", roleRoutes);
app.use("/auth", authRoutes);
app.use("/permissions", permissionRoutes);
app.use("/role-permissions", rolePermissionRoutes);

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});

const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const axios = require("axios");

function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado: token faltante" });
  }

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      roleId: payload.roleId,
    };
    return next();
  } catch (err) {
    console.error("Error verifying token:", err);
    return res.status(403).json({ message: "Token inválido" });
  }
}

function authorize(permissionName, action) {
  return async (req, res, next) => {
    const { roleId } = req.user;
    try {
      // Llama al auth-service para verificar el permiso
      const response = await axios.get(
        `${process.env.AUTH_URL}/role-permissions/role-permissions`,
        {
          params: {
            roleId,
            permissionName,
            action,
          },
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );

      if (!response.data || response.data.allowed !== true) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para realizar esta acción" });
      }
      next();
    } catch (err) {
      console.error("Error chequeando permisos:", err.message);
      res.status(500).json({ message: "Error interno de autorización" });
    }
  };
}

module.exports = { authenticateJWT, authorize };

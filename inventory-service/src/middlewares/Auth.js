const jwt = require("jsonwebtoken");
const axios = require("axios");


function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado: token faltante" });
  }

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token payload:", payload);    
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
  console.log("Authorize middleware called with:", {
    permissionName,
    action,
  });
  
  return async (req, res, next) => {
    const { roleId } = req.user; // Asumiendo que ya está autenticado y req.user.roleId existe
    if (!roleId) {
      return res.status(401).json({ message: "No autorizado: falta rol" });
    }
    try {
      const response = await axios.get(
        `${process.env.AUTH_URL}/role-permissions/check`,
        {
          params: { roleId, permissionName, action },
          headers: { Authorization: req.headers.authorization },
        }
      );
      if (!response.data.allowed) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para esta acción" });
      }
      next();
    } catch (error) {
      console.error(
        "Error consultando permisos en auth-service:",
        error.message
      );
      res.status(500).json({ message: "Error interno de autorización" });
    }
  };
}

module.exports = { authenticateJWT, authorize };

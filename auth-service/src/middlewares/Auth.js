const jwt = require("jsonwebtoken");

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado: token faltante" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!allowedRoles.includes((decoded.role.toLowerCase())) && allowedRoles.length > 0) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para acceder a esta ruta" });
      }

      req.user = decoded; 
      next();
    } catch (error) {
      console.error("Error verifying token:", error); // Log the error for debugging
      return res.status(403).json({ message: "Token inválido" });
    }
  };
};

module.exports = authorizeRoles;

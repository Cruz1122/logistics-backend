const jwt = require("jsonwebtoken");

/**
 * Middleware para proteger rutas con JWT y control de rol.
 * Permite pasar un array de roles permitidos (por defecto, permite todos si no se pasa).
 */
const authenticate = (allowedRoles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Guarda el usuario en la request

      if (
        allowedRoles.length > 0 &&
        (!decoded.roleId || !allowedRoles.includes(decoded.roleId))
      ) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
};

module.exports = authenticate;

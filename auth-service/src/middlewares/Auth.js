const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");


/**
 * Middleware to authenticate requests using JWT.
 * Checks for a Bearer token in the Authorization header, verifies it,
 * and attaches the user info (id and roleId) to the request object.
 * Responds with 401 if the token is missing, and 403 if the token is invalid.
 */
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


/**
 * Middleware to authorize a user based on their role's permissions.
 * Checks if the user's role has the specified permission and action.
 * Responds with 403 if the user does not have permission.
 * @param {string} permissionName - The name of the permission to check.
 * @param {string} action - The action to check (e.g., 'listar', 'crear', etc.).
 */
function authorize(permissionName, action) {
  return async (req, res, next) => {
    const { roleId } = req.user;
    try {
      const rp = await prisma.rolePermission.findFirst({
        where: {
          roleId,
          permission: { name: permissionName },
        },
        select: { [action]: true },
      });

      if (!rp || rp[action] !== true) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para realizar esta acción" });
      }
      next();
    } catch (err) {
      console.error("Error chequeando permisos:", err);
      res.status(500).json({ message: "Error interno de autorización" });
    }
  };
}

module.exports = { authenticateJWT, authorize };

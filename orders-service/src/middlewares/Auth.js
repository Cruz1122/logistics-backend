const jwt = require("jsonwebtoken");
const axios = require("axios");

/**
 * Middleware to authenticate requests using JWT.
 * Checks for a Bearer token in the Authorization header, verifies it,
 * and attaches the user info (id and roleId) to the request object.
 * Responds with 401 if the token is missing, and 403 if the token is invalid.
 */
function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: missing token" });
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
    return res.status(403).json({ message: "Invalid token" });
  }
}

/**
 * Middleware to authorize a user based on their role's permissions.
 * Calls the auth-service to check if the user's role has the specified permission and action.
 * Responds with 403 if the user does not have permission.
 * @param {string} permissionName - The name of the permission to check.
 * @param {string} action - The action to check (e.g., 'listar', 'crear', etc.).
 */
function authorize(permissionName, action) {
  return async (req, res, next) => {
    const { roleId } = req.user; // Assumes authentication has already set req.user.roleId
    if (!roleId) {
      return res.status(401).json({ message: "Unauthorized: missing role" });
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
          .json({ message: "You do not have permission for this action" });
      }
      next();
    } catch (error) {
      console.error(
        "Error checking permissions in auth-service:",
        error.message
      );
      res.status(500).json({ message: "Authorization internal error" });
    }
  };
}

module.exports = { authenticateJWT, authorize };
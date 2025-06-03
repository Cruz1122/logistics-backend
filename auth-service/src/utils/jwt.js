const jwt = require("jsonwebtoken");

/**
 * Generates a JWT token with the given payload and expiration time.
 * @param {Object} payload - The data to encode in the token.
 * @returns {string} The signed JWT token.
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION_TIME || "24h",
  });
};

/**
 * Verifies a JWT token and returns the decoded payload if valid.
 * Throws an error if the token is invalid or expired.
 * @param {string} token - The JWT token to verify.
 * @returns {Object} The decoded payload.
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
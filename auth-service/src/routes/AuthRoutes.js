const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const {
  signUp,
  verifyEmail,
  resendVerificationCode,
  signIn,
  verifyTwoFactor,
  requestPasswordReset,
  resetPassword,
  changePassword,
  health,
  getUserPermissions,
  resend2FACode,
} = require("../controllers/AuthController");

//signup user:
/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: signup a new user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - lastName
 *               - phone
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado y código de verificación enviado por correo
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Email ya registrado
 */
router.post("/signup", signUp);

//verify email:
/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify code sent to email
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account successfully verified
 *       400:
 *         description: Invalid or expired code
 */
router.post("/verify-email", verifyEmail);

//resend verification code:
/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend verification code to email
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code resent
 *       404:
 *         description: User not found
 */
router.post("/resend-verification", resendVerificationCode);

//signin user:
/**
 * @swagger
 * /auth/signin:
 *   post:
 *     summary: Sign in and send 2FA code
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - method
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [sms, email]
 *     responses:
 *       200:
 *         description: 2FA code sent
 *       401:
 *         description: Invalid credentials
 */
router.post("/signin", signIn);

//verify two-factor authentication (2FA) code:
/**
 * @swagger
 * /auth/verify-two-factor:
 *   post:
 *     summary: Verify 2FA code (email or SMS)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Invalid or expired code
 */

router.post("/verify-two-factor", verifyTwoFactor);

//request password reset code via email:
/**
 * @swagger
 * /auth/request-password-reset:
 *   post:
 *     summary: Send password reset code via email
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset code sent
 *       404:
 *         description: User not found
 */
router.post("/request-password-reset", requestPasswordReset);

//reset password using recovery code:
/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using recovery code
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password successfully reset
 *       400:
 *         description: Invalid or expired code
 */
router.post("/reset-password", resetPassword);

//change password when authenticated:
/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     summary: Change password when authenticated
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: Authenticated users only
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password successfully changed
 *       401:
 *         description: Incorrect current password
 */
router.patch("/change-password", authenticateJWT, authorize("Account Management", "editar"), changePassword);

/**
 * @swagger
 * /auth/users/{userId}/permissions:
 *   get:
 *     summary: Retrieve user permissions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: ID of the user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/users/:userId/permissions",
  authenticateJWT,
  authorize("Account Management", "listar"),
  getUserPermissions
);

router.post("/resend-two-factor", resend2FACode);

router.get("/health", health);

module.exports = router;

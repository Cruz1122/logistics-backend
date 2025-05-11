const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { sendVerificationEmail } = require("../utils/mailer");
const { generateToken } = require("../utils/jwt");
const { client } = require("../utils/twilio");

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
};

const capitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ") // Divide la cadena en palabras
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitaliza cada palabra
    .join(" "); // Une las palabras nuevamente
};

const generate2FACode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const signUp = async (req, res) => {
  const { email, password, name, lastName, phone, roleId } = req.body;

  try {
    if (!email || !password || !name || !lastName || !phone) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }
    

    if (roleId) {
      const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
      if (!roleExists) {
        return res.status(422).json({ error: `Invalid roleId: ${roleId}` });
      }
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 6 characters, include uppercase, lowercase, number and special character",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const formattedName = capitalize(name);
    const formattedLastName = capitalize(lastName);

    const emailCode = generateVerificationCode();
    const emailCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: formattedName,
        lastName: formattedLastName,
        phone,
        roleId,
        emailVerified: false,
        emailCode: emailCode,
        emailCodeExpiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const emailSent = await sendVerificationEmail(
      email,
      emailCode,
      `${formattedName} ${formattedLastName}`,
      "Email verification"
    );
    if (!emailSent) {
      await prisma.user.delete({ where: { id: user.id } });
      return res
        .status(500)
        .json({ error: "Failed to send verification email" });
    }

    res.status(201).json({
      message:
        "User registered. Please check your email to verify your account.",
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
};

// ---------------------------------------|| -------------------------------------------||

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email, emailCode: code },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid verification code or email." });
    }

    const now = new Date();

    if (now > user.emailCodeExpiresAt) {
      return res.status(400).json({ error: "Verification code has expired." });
    }

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        emailCode: null,
        emailCodeExpiresAt: null,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      message: "Account verified successfully."
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Failed to verify account." });
  }
};

// ---------------------------------------|| -------------------------------------------||

const resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "User is already verified." });
    }

    const newCode = generateVerificationCode();
    const expirationTime = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        emailCode: newCode,
        emailCodeExpiresAt: expirationTime,
        updatedAt: new Date(),
      },
    });

    const emailSent = await sendVerificationEmail(
      email,
      newCode,
      `${user.name} ${user.lastName || ""}`,
      "Email verification"
    );

    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send verification email." });
    }

    res.status(200).json({
      message: "Verification code resent successfully. Please check your email.",
    });
  } catch (error) {
    console.error("Error resending verification code:", error);
    res.status(500).json({ error: "Failed to resend verification code." });
  }
};

// ---------------------------------------|| -------------------------------------------||

const signIn = async (req, res) => {
  const { email, password, method } = req.body;

  if (!email || !password || !method) {
    return res.status(400).json({ error: "Email, password and method are required." });
  }

  if (!["sms", "email"].includes(method)) {
    return res.status(400).json({ error: "Invalid method. Must be 'sms' or 'email'." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: "Please verify your email first." });
    }

    const code = generate2FACode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: code,
        twoFactorCodeExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    });

    if (method === "sms") {
      if (!user.phone) {
        return res.status(400).json({ error: "Phone number is required for SMS login." });
      }

      // Verificar que tenga '+' al inicio
      if (!user.phone.startsWith("+")) {
        return res
          .status(400)
          .json({
            error: "Invalid phone number format. Must include country code.",
          });
      }

      const smsSent = await client.messages.create({
        body: `Your access code is: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone,
      });
      if (!smsSent) {
        return res.status(500).json({ error: "Failed to send SMS code." });
      }
    } else if (method === "email") {
      const emailSent = await sendVerificationEmail(
        email,
        code,
        `${user.name} ${user.lastName}`,
        "2FA"
      );
      if (!emailSent) {
        return res.status(500).json({ error: "Failed to send email code." });
      }
    }

    res.status(200).json({
      message: `2FA code sent via ${method.toUpperCase()}. Please verify to complete login.`,
      email: user.email,
      method,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed." });
  }
};

// ---------------------------------------|| -------------------------------------------||

const verifyTwoFactor = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email, twoFactorCode: code },
      include: { role: true },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid code or email." });
    }

    if (new Date() > user.twoFactorCodeExpiresAt) {
      return res.status(400).json({ error: "Code expired." });
    }

    // Limpiar código 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: null,
        twoFactorCodeExpiresAt: null,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
    });    

    res.status(200).json({
      message: "2FA verified successfully.",
      token,
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    res.status(500).json({ error: "Failed to verify 2FA code." });
  }
};

// ---------------------------------------|| -------------------------------------------||

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: resetCode,
        passwordResetCodeExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    });

    const emailSent = await sendVerificationEmail(
      user.email,
      resetCode,
      `${user.name} ${user.lastName}`,
      "Password reset"
    );

    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send reset code." });
    }

    res.status(200).json({
      message: "Password reset code sent to your email.",
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(500).json({ error: "Failed to request password reset." });
  }
};

// ---------------------------------------|| -------------------------------------------||

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code and new password are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
        passwordResetCode: code,
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or reset code." });
    }

    if (new Date() > user.passwordResetCodeExpiresAt) {
      return res.status(400).json({ error: "Reset code has expired." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "Password must be at least 6 characters, include uppercase, lowercase, number and special character",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetCode: null,
        passwordResetCodeExpiresAt: null,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
};

// ---------------------------------------|| -------------------------------------------||


const changePassword = async (req, res) => {
  const { email, password, newPassword } = req.body;

  if (!email || !password || !newPassword) {
    return res.status(400).json({ error: "Email, current password, and new password are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    if (password === newPassword) {
      return res.status(400).json({ error: "New password must be different from current password." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "New password must be at least 6 characters, include uppercase, lowercase, number and special character.",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Failed to update password." });
  }
};

const getUserPermissions = async (req, res) => {
  const { userId } = req.params;

  try {
    // Verifica si el usuario existe y obtiene su roleId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }, // Incluye el rol del usuario
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Obtén los permisos asociados al rol del usuario
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: user.roleId },
      include: { permission: true }, // Incluye los detalles del permiso
    });

    // Formatea los permisos para la respuesta
    const permissions = rolePermissions.map((rp) => ({
      permissionId: rp.permissionId,
      name: rp.permission.name,
      listar: rp.listar,
      eliminar: rp.eliminar,
      crear: rp.crear,
      editar: rp.editar,
      descargar: rp.descargar,
    }));

    res.status(200).json({
      userId: user.id,
      roleId: {
        id: user.roleId,
        name: user.role.name,
        description: user.role.description,
      },
      permissions,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ error: "Failed to fetch user permissions." });
  }
};

const health = async (req, res) => {
  try {
    res.status(200).send("OK");
  } catch (err) {
    console.error("Health check failed:", err); // Log the error details
    res.status(500).send("Unhealthy");
  }
};

module.exports = {
  signUp,
  verifyEmail,
  resendVerificationCode,
  signIn,
  verifyTwoFactor,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getUserPermissions,
  health,
};
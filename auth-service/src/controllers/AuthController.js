const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { sendVerificationEmail } = require("../utils/mailer");
const jwt = require("jsonwebtoken");

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Ej: 6 dígitos
};

const signUp = async (req, res) => {
  const { email, password, name, lastName, phone, roleId } = req.body;

  try {
    if (!email || !password || !name || !lastName || !phone || !roleId) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) {
      return res.status(422).json({ error: `Invalid roleId: ${roleId}` });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

    if (!passwordRegex.test(password)) {
      return res
        .status(400)
        .json({
          error:
            "Password must be at least 6 characters, include uppercase, lowercase, number and special character",
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailCode = generateVerificationCode();
    const emailCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        lastName,
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
      `${name} ${lastName}`
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

    const token = jwt.sign(
      { id: user.id, roleId: user.roleId },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      message: "Account verified successfully.",
      token,
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Failed to verify account." });
  }
};

// app.post("/roles", async (req, res) => {
//   const { name, description } = req.body;
//   try {
//     const role = await prisma.Role.create({
//       data: { name, description },
//     });
//     res.json(role);
//   } catch (error) {
//     console.error("Error creating role:", error); // Log the error details
//     res.status(500).json({ error: "Failed to create role" });
//   }
// });

// app.get("/roles", async (req, res) => {
//   const roles = await prisma.Role.findMany();
//   res.json(roles);
// });

// app.get("/users", async (req, res) => {
//     const users = await prisma.User.findMany();
//     res.json(users);
//   });

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
  health,
};

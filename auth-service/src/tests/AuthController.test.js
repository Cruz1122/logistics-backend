jest.mock("@prisma/client", () => {
  const mockUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockRole = {
    findUnique: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => ({
      user: mockUser,
      role: mockRole,
    })),
  };
});

jest.mock("../utils/mailer", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(false),
}));

jest.mock("twilio", () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: "1234567890" }),
    },
  }));
});

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mockedToken"),
  verify: jest.fn().mockReturnValue({ id: "1" }),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword"),
  compare: jest.fn().mockResolvedValue(true),
}));

const request = require("supertest"); // simula peticiones HTTP
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  signUp,
  verifyEmail,
  signIn,
  verifyTwoFactor,
  resetPassword,
  resendVerificationCode,
  requestPasswordReset,
  changePassword,
} = require("../controllers/AuthController"); // Importa la función signUp
const { sendVerificationEmail } = require("../utils/mailer"); // Importa la función sendVerificationEmail
const prisma = new PrismaClient(); // ahora es una versión falsa gracias al mock
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const e = require("express");

describe("signUp", () => {
  let req;
  let res;
  // Limpiamos los mocks
  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return a message that asks for all required fields", async () => {
    req.body = {
      name: "John",
      lastName: "Doe",
    };

    await signUp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "All fields are required" });
  });

  test("Should return an error if the email format is invalid", async () => {
    req.body = {
      email: "invalid-email",
      password: "Password123@",
      name: "John",
      lastName: "Doe",
      phone: "1234567890",
      roleId: "1",
    };

    await signUp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid email format" });
  });

  test("Should return an error if the email is already in use", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      name: "John",
      lastName: "Doe",
      phone: "1234567890",
      roleId: "1",
    };
    prisma.user.findUnique.mockResolvedValueOnce({ email: "john@doe.com" });
    await signUp(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "Email already in use" });
  });

  test("Should return an error if the roleId is invalid", async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      name: "John",
      lastName: "Doe",
      phone: "1234567890",
      roleId: "999",
    };
    await signUp(req, res);
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { id: "999" },
    });
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid roleId: 999",
    });
  });

  test("Should return an error if the password is invalid", async () => {
    req.body = {
      email: "john@doe.com",
      password: "short",
      name: "John",
      lastName: "Doe",
      phone: "1234567890",
      roleId: "1",
    };
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: "1" });
    await signUp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Password must be at least 6 characters, include uppercase, lowercase, number and special character",
    });
  });

  test("Should create a user successfully", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      name: "John",
      lastName: "Doe",
      phone: "1234567890",
      roleId: "1",
    };
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: "1" });
    prisma.user.create.mockResolvedValue({
      id: "1",
      email: "john@doe.com",
      password: "Password123@",
      name: "John",
      lastName: "Doe",
      phone: "1234567890",
      roleId: "1",
      emailVerified: false,
      emailCode: "123456",
      emailCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    sendVerificationEmail.mockResolvedValue(true);

    await signUp(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message:
        "User registered. Please check your email to verify your account.",
      userId: "1",
      email: "john@doe.com",
    });
  });
});

describe("verifyEmail", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return an error if email or code is missing", async () => {
    req.body = {
      email: "",
      code: "123456",
    };

    await verifyEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email and code are required.",
    });
  });

  test("Should return an error if the verification code is invalid", async () => {
    req.body = {
      email: "john@doe.com",
      code: "000000",
    };
    // Simulate that an user with the provided email and code doesn't exists
    prisma.user.findUnique.mockResolvedValue(null);
    await verifyEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid verification code or email.",
    });
  });

  test("Should return an error if the verification code has expired", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
    };
    // Simulate that an user with the provided email and code exists and the code has expired
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      emailCode: "123456",
      emailCodeExpiresAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    });
    await verifyEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Verification code has expired.",
    });
  });

  test("Should verify the email successfully", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
    };

    // Simulate that an user with the provided email and code exists and the code is valid
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      code: "123456",
    });
    prisma.user.update.mockResolvedValue({
      emailVerified: true,
      emailCode: null,
      emailCodeExpiresAt: null,
    });
    await verifyEmail(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com", emailCode: "123456" },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
      data: {
        emailVerified: true,
        emailCode: null,
        emailCodeExpiresAt: null,
        updatedAt: expect.any(Date),
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Account verified successfully.",
      token: expect.any(String),
    });
  });
});

describe("signIn", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return an error if email, password or method is missing", async () => {
    req.body = {
      password: "Password123@",
      method: "email",
    };

    await signIn(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email, password and method are required.",
    });
  });

  test("Should return an error if the method is invalid", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      method: "invalidMethod",
    };

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid method. Must be 'sms' or 'email'.",
    });
  });

  test("Should return an error if the user is not found", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      method: "email",
    };

    // Simulate that the user is not found
    prisma.user.findUnique.mockResolvedValue(null);
    await signIn(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "User not found.",
    });
  });

  test("Should return an error if the password is incorrect", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      method: "email",
    };

    // Simulate that the user is found but the password is incorrect
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      password: "WrongPassword",
      emailVerified: true,
    });
    bcrypt.compare.mockResolvedValue(false);

    await signIn(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid credentials.",
    });
  });

  test("Should return an error if the account is not verified", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      method: "email",
    };

    // Simulate that the user is found but the account is not verified
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      password: "Password123@",
      emailVerified: false,
    });

    bcrypt.compare.mockResolvedValue(true);

    await signIn(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Please verify your email first.",
    });
  });

  test("Should return an error if login method is sms and phone is not provided", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      method: "sms",
    };

    // Simulate that the user is found and the account is verified
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      password: "Password123@",
      emailVerified: true,
      phone: null,
    });

    bcrypt.compare.mockResolvedValue(true);

    await signIn(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Phone number is required for SMS login.",
    });
  });

  test("Should return an error if the phone number is invalid", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      method: "sms",
    };

    // Simulate that the user is found and the account is verified
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      password: "Password123@",
      emailVerified: true,
      phone: "1234567890", // Doesn't have '+' prefix
    });

    bcrypt.compare.mockResolvedValue(true);

    await signIn(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid phone number format. Must include country code.",
    });
  });

  test("Should send a verification code successfully", async () => {
    req.body = {
      email: "john@doe.com",
      password: "Password123@",
      method: "email",
    };

    // Simulate that the user is found and the account is verified
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      password: "Password123@",
      emailVerified: true,
      phone: "+571234567890",
    });

    bcrypt.compare.mockResolvedValue(true);

    sendVerificationEmail.mockResolvedValue(true);

    await signIn(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: `2FA code sent via EMAIL. Please verify to complete login.`,
      email: "john@doe.com",
      method: "email",
    });
  });
});

describe("verifyTwoFactor", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return an error if email or code is missing", async () => {
    req.body = {
      code: "123456",
    };

    await verifyTwoFactor(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email and code are required.",
    });
  });

  test("Should return an error if the verification code is invalid", async () => {
    req.body = {
      email: "john@doe.com",
      code: "000000",
    };

    // Simulate that an user with the provided email and code doesn't exists
    prisma.user.findUnique.mockResolvedValue(null);
    await verifyTwoFactor(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid code or email.",
    });
  });

  test("Should return an error if the verification code has expired", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
    };
    // Simulate that an user with the provided email and code exists and the code has expired
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      twoFactorCode: "123456",
      twoFactorCodeExpiresAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    });
    await verifyTwoFactor(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Code expired.",
    });
  });

  test("Should verify the two-factor code successfully", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
    };

    // Simulate that an user with the provided email and code exists and the code is valid
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      twoFactorCode: "123456",
      twoFactorCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    });
    prisma.user.update.mockResolvedValue({
      twoFactorCode: null,
      twoFactorCodeExpiresAt: null,
    });

    // Simulate JWT token generation
    jwt.sign.mockReturnValue("mockedToken");

    await verifyTwoFactor(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "2FA verified successfully.",
      token: "mockedToken",
    });
  });
});

describe("requestPasswordReset", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return an error if email is missing", async () => {
    req.body = {};

    await requestPasswordReset(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email is required.",
    });
  });

  test("Should return an error if the user is not found", async () => {
    req.body = {
      email: "john@doe.com",
    };
    // Simulate that the user is not found
    prisma.user.findUnique.mockResolvedValue(null);
    await requestPasswordReset(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "User not found.",
    });
  });

  test("Should return an error if the email could not be sent", async () => {
    req.body = {
      email: "john@doe.com",
    };
    // Simulate that the user is found
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      name: "John",
      lastName: "Doe",
      email: "john@doe.com",
      password: "Password123@",
      emailVerified: true,
    });

    prisma.user.update.mockResolvedValue({
      passwordResetCode: "123456",
      passwordResetCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      updatedAt: new Date(),
    });

    // Simulate that the email could not be sent
    sendVerificationEmail.mockResolvedValue(false);

    await requestPasswordReset(req, res);

    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "john@doe.com",
      expect.any(String),
      "John Doe",
      "Password reset"
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to send reset code.",
    });
  });

  test("Should send a password reset code successfully", async () => {
    req.body = {
      email: "john@doe.com",
    };
    // Simulate that the user is found
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      name: "John",
      lastName: "Doe",
      email: "john@doe.com",
      password: "Password123@",
      emailVerified: true,
    });
    prisma.user.update.mockResolvedValue({
      passwordResetCode: "123456",
      passwordResetCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      updatedAt: new Date(),
    });
    sendVerificationEmail.mockResolvedValue(true);

    await requestPasswordReset(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "john@doe.com",
      expect.any(String),
      "John Doe",
      "Password reset"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Password reset code sent to your email.",
    });
  });
});

describe("resetPassword", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return an error if email, code or new password is missing", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
    };
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email, code and new password are required.",
    });
  });

  test("Should return an error if the user is not found or the code is not correct", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
      newPassword: "NewPassword123@",
    };

    // Simulate that the user is not found or the code is not correct
    prisma.user.findUnique.mockResolvedValue(null);
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid email or reset code.",
    });
  });

  test("Should return an error if the reset code has expired", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
      newPassword: "NewPassword123@",
    };
    // Simulate that the user is found but the reset code has expired
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      passwordResetCode: "123456",
      passwordResetCodeExpiresAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    });
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Reset code has expired.",
    });
  });

  test("Should return an error if the new password is invalid", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
      newPassword: "invalid",
    };

    // Simulate that the user is found and the reset code is valid
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      passwordResetCode: "123456",
      passwordResetCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    });
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Password must be at least 6 characters, include uppercase, lowercase, number and special character",
    });
  });

  test("Should reset the password successfully", async () => {
    req.body = {
      email: "john@doe.com",
      code: "123456",
      newPassword: "NewPassword123@",
    };

    // Simulate that the user is found and the reset code is valid
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      email: "john@doe.com",
      passwordResetCode: "123456",
      passwordResetCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    });

    prisma.user.update.mockResolvedValue({
      password: "hashedPassword",
      passwordResetCode: null,
      passwordResetCodeExpiresAt: null,
      updatedAt: new Date(),
    });

    bcrypt.hash.mockResolvedValue("hashedPassword");
    await resetPassword(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com", passwordResetCode: "123456" },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: {
        password: "hashedPassword",
        passwordResetCode: null,
        passwordResetCodeExpiresAt: null,
        updatedAt: expect.any(Date),
      },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith("NewPassword123@", 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Password reset successfully.",
    });
  });
});

describe("resendVerificationCode", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return an error if email is missing", async () => {
    req.body = {};

    await resendVerificationCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email is required.",
    });
  });

  test("Should return an error if the user is not found", async () => {
    req.body = {
      email: "john@doe.com",
    };
    // Simulate that the user is not found
    prisma.user.findUnique.mockResolvedValue(null);
    await resendVerificationCode(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "User not found.",
    });
  });
  test("Should return an error if the user is already verified", async () => {
    req.body = {
      email: "john@doe.com",
    };
    // Simulate that the user is found and already verified
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      isVerified: true,
    });
    await resendVerificationCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "User is already verified.",
    });
  });

  test("Should return an error if the email could not be sent", async () => {
    req.body = {
      email: "john@doe.com",
    };
    // Simulate that the user is found and not verified
    prisma.user.findUnique.mockResolvedValue({
      name: "John",
      lastName: "Doe",
      email: "john@doe.com",
    });

    prisma.user.update.mockResolvedValue({
      emailCode: "123456",
      emailCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      updatedAt: new Date(),
    });

    // Simulate that the email could not be sent
    sendVerificationEmail.mockResolvedValue(false);

    await resendVerificationCode(req, res);
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "john@doe.com",
      expect.any(String),
      "John Doe",
      "Email verification"
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to send verification email.",
    });
  });

  test("Should resend the verification code successfully", async () => {
    req.body = {
      email: "john@doe.com",
    };
    // Simulate that the user is found and not verified
    prisma.user.findUnique.mockResolvedValue({
      name: "John",
      lastName: "Doe",
      email: "john@deo.com",
    });
    prisma.user.update.mockResolvedValue({
      emailCode: "123456",
      emailCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      updatedAt: new Date(),
    });
    sendVerificationEmail.mockResolvedValue(true);

    await resendVerificationCode(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
      data: {
        emailCode: expect.any(String),
        emailCodeExpiresAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "john@doe.com",
      expect.any(String),
      "John Doe",
      "Email verification"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message:
        "Verification code resent successfully. Please check your email.",
    });
  });
});

describe("changePassword", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return an error if email, oldPassword or newPassword is missing", async () => {
    req.body = {
      email: "john@doe.com",
      newPassword: "NewPassword123@",
    };

    await changePassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email, current password, and new password are required.",
    });
  });

  test("Should return an error if the user is not found", async () => {
    req.body = {
      email: "john@doe.com",
      password: "OldPassword123@",
      newPassword: "NewPassword123@",
    };

    // Simulate that the user is not found
    prisma.user.findUnique.mockResolvedValue(null);
    await changePassword(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "User not found.",
    });
  });

  test("Should return an error if the old password is incorrect", async () => {
    req.body = {
      email: "john@doe.com",
      password: "OldPassword123@",
      newPassword: "NewPassword123@",
    };

    // Simulate that the user is found but the old password is incorrect
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      password: "WrongPassword",
    });

    bcrypt.compare.mockResolvedValue(false);
    await changePassword(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Current password is incorrect.",
    });
  });

  test("Should return an error if the new password is the same as the current one", async () => {
    req.body = {
      email: "john@doe.com",
      password: "OldPassword123@",
      newPassword: "OldPassword123@",
    };

    // Simulate that the user is found and the old password is correct
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      password: "OldPassword123@",
    });

    bcrypt.compare.mockResolvedValue(true);
    await changePassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "New password must be different from current password.",
    });
  });

  test("Should return an error if the new password is invalid", async () => {
    req.body = {
      email: "john@doe.com",
      password: "OldPassword123@",
      newPassword: "short",
    };

    // Simulate that the user is found and the old password is correct
    prisma.user.findUnique.mockResolvedValue({
      email: "john@doe.com",
      password: "OldPassword123@",
    });

    bcrypt.compare.mockResolvedValue(true);
    await changePassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "New password must be at least 6 characters, include uppercase, lowercase, number and special character.",
    });
  });

  test("Should change the password successfully", async () => {
    req.body = {
      email: "john@doe.com",
      password: "OldPassword123@",
      newPassword: "NewPassword123@",
    };

    // Simulate that the user is found and the old password is correct
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      email: "john@doe.com",
      password: "OldPassword123@",
    });

    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("hashedNewPassword");
    prisma.user.update.mockResolvedValue({
      email: "john@doe.com",
      password: "hashedNewPassword",
    });

    await changePassword(req, res);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "john@doe.com" },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "OldPassword123@",
      "OldPassword123@"
    );
    expect(bcrypt.hash).toHaveBeenCalledWith("NewPassword123@", 10);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: {
        password: "hashedNewPassword",
        updatedAt: expect.any(Date),
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Password updated successfully.",
    });
  });
});
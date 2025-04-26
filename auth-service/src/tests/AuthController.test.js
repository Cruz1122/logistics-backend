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

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      response: "250 Message sent",
    }),
  }),
}));

const request = require("supertest"); // simula peticiones HTTP
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { signUp, verifyEmail } = require("../controllers/AuthController"); // Importa la función signUp

const prisma = new PrismaClient(); // ahora es una versión falsa gracias al mock

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

    // Simulamos el envío del correo electrónico
    const sendVerificationEmail = jest.fn().mockResolvedValue(true);
    const emailSent = await sendVerificationEmail(
      req.body.email,
      "123456",
      `${req.body.name} ${req.body.lastName}`
    );
    expect(emailSent).toBe(true);

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
  })

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
    }
  );

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
      where: { email: "john@doe.com",
      emailCode: "123456"
      }
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
  }
  );
});


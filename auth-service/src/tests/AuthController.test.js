jest.mock("@prisma/client", () => {
  const mockUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
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

const request = require("supertest"); // simula peticiones HTTP
const app = require("../src/index"); // importa tu Express (ajusta la ruta si es necesario)
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient(); // ahora es una versión falsa gracias al mock

describe("signUp", () => {
  let req;
  let res;
  // Limpiamos los mocks
  beforeEach(() => {
    jest.clearAllMocks();
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
      password: "password123",
      name: "John",
      lastName: "Doe",
      phone: "1234567890",
      roleId: 1,
    };

    await signUp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid email format" });
  });

  test("Should return an error if the email is already in use", async () => {
    req.body = {
      email: "john@doe.com",
      password: "password123",
      name: "John",
      lastName: "Doe",
      phone: "1234567890",
      roleId: 1,
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
    req.body = {
      email: "",
        password: "password123",
        name: "John",
        lastName: "Doe",
        phone: "1234567890",
        roleId: 999, // Assuming this roleId does not exist
    };
    prisma.role.findUnique.mockResolvedValueOnce(null);
    await signUp(req, res);
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid roleId: 999",
    });
  })
});

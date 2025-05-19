const {
  uploadWarehousesWithManagers,
} = require("../controllers/CsvWarehouseController");
const prisma = require("../config/prisma");
const EventEmitter = require("events");
const mockLog = jest.fn();

jest.mock("fs");
jest.mock("axios");
jest.mock("../config/prisma", () => ({
  warehouse: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  city: {
    findMany: jest.fn(),
  },
  user: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
}));

const fs = require("fs");
const axios = require("axios");

describe("uploadWarehousesWithManagers", () => {
  let req, res;

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterAll(() => {
    console.log.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.create.mockResolvedValue({ id: "USER001" });
    prisma.user.update.mockResolvedValue({ id: "USER001" });
    prisma.user.findUnique.mockResolvedValue(null);

    req = {
      file: { path: "fake-path.csv" },
      headers: {
        authorization: "Bearer test-token",
      },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };

    fs.createWriteStream.mockReturnValue({
      write: jest.fn(),
      end: jest.fn(),
    });

    // Simula un stream de lectura de CSV usando EventEmitter
    const mockStream = new EventEmitter();
    mockStream.pipe = jest.fn().mockReturnValue(mockStream);

    fs.existsSync.mockReturnValue(true);
    fs.createReadStream.mockReturnValue(mockStream);

    // Dispara los eventos después de un tick
    setImmediate(() => {
      mockStream.emit("data", {
        id_almacen: "W001",
        nombre_almacen: "Almacen Central",
        ciudad: "Bogotá",
        departamento: "Cundinamarca",
        direccion: "Calle Falsa 123",
        codigo_postal: "110111",
        latitud: "4.60971",
        longitud: "-74.08175",
        capacidad_m2: "500",
        estado: "activo",
        gerente: "Juan Pérez",
        email: "juan.perez@example.com",
        telefono: "3001234567",
      });
      mockStream.emit("end");
    });

    prisma.city.findMany.mockResolvedValue([
      {
        id: "CITY001",
        name: "Bogotá",
        state: { name: "Cundinamarca" },
      },
    ]);

    axios.get.mockImplementation((url) => {
      if (url.includes("/users/email/")) {
        return Promise.reject(); // Simula usuario no encontrado
      }
      return Promise.resolve({ data: { user: { id: "USER001" } } });
    });

    axios.post.mockResolvedValue({
      data: { user: { id: "USER001" } },
    });

    prisma.warehouse.findUnique.mockResolvedValue(null);
    prisma.warehouse.create.mockResolvedValue({});
  });

  it("Should import warehouses and create the manager succesfully", async () => {
    await uploadWarehousesWithManagers(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Importación completada",
        resumen: expect.objectContaining({
          almacenesCreados: 1,
          usuariosGerentesCreados: 1,
        }),
      })
    );
  });

it("Should return an error if a general exception occurs", async () => {
    fs.createReadStream.mockImplementationOnce(() => {
        throw new Error("Fallo de lectura");
    });

    await uploadWarehousesWithManagers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
            error: "Fallo importación almacenes",
        })
    );
});
});

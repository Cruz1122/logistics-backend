const { uploadProductCSV } = require("../controllers/CsvProductController");
const prisma = require("../config/prisma");
const axios = require("axios");
const fs = require("fs");

// Mockeo general para evitar logs en consola
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// Limpieza después de tests
afterAll(() => {
  jest.restoreAllMocks();
});

jest.mock("../config/prisma", () => ({
  warehouse: { findMany: jest.fn() },
  supplier: { findMany: jest.fn(), createMany: jest.fn() },
  category: { findMany: jest.fn(), createMany: jest.fn() },
  product: { findMany: jest.fn(), createMany: jest.fn() },
  productWarehouse: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  productSupplier: { findMany: jest.fn(), createMany: jest.fn() },
  productWarehouseMovement: { createMany: jest.fn() },
}));

jest.mock("axios");

jest.mock("fs", () => {
  const originalFs = jest.requireActual("fs");
  return {
    ...originalFs,
    createReadStream: jest.fn(() => {
      const stream = require("stream");
      const readable = new stream.Readable({ read() {} });
      setImmediate(() => {
        readable.emit("end");
      });
      return readable;
    }),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    createWriteStream: jest.fn(() => ({
      write: jest.fn(),
      end: jest.fn(),
    })),
  };
});

// Mock para la función sendStockEmail
jest.mock("../utils/mailer", () => ({
  sendStockEmail: jest.fn().mockResolvedValue(true),
}));

describe("uploadProductCSV", () => {
  it("debería procesar el archivo y devolver resumen", async () => {
    // Preparar mocks de prisma
    prisma.warehouse.findMany.mockResolvedValue([{ id: "WH1" }]);
    prisma.supplier.findMany.mockResolvedValue([]);
    prisma.supplier.createMany.mockResolvedValue({});
    prisma.category.findMany.mockResolvedValue([]);
    prisma.category.createMany.mockResolvedValue({});
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.createMany.mockResolvedValue({});
    prisma.productWarehouse.findMany.mockResolvedValue([]);
    prisma.productWarehouse.createMany.mockResolvedValue({});
    prisma.productWarehouse.update.mockResolvedValue({});
    prisma.productSupplier.findMany.mockResolvedValue([]);
    prisma.productSupplier.createMany.mockResolvedValue({});
    prisma.productWarehouseMovement.createMany.mockResolvedValue({});

    // Mocks axios para dispatchers vacíos (sin alertas)
    axios.get.mockResolvedValue({ data: [] });

    // Crear objeto req y res simulados
    const req = {
      file: { path: "fakepath.csv" },
      headers: { authorization: "Bearer faketoken" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Ejecutar función
    await uploadProductCSV(req, res);

    // Validar que se responde 201 y retorna resumen esperado
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Importación completada",
        resumen: expect.any(Object),
      })
    );
  });

  it("debería manejar errores y responder con status 400", async () => {
    const req = {
      file: { path: "unsupportedfile.txt" }, // archivo no soportado para forzar error
      headers: { authorization: "" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await uploadProductCSV(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(String),
        detalle: expect.any(String),
      })
    );
  });
});

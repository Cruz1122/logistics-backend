// tests/CsvProductController.test.js

const { mockPrisma } = require("./__mocks__/prisma1");

const { uploadProductCSV } = require("../controllers/CsvProductController");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const xlsx = require("xlsx");
// __tests__/csvProductController.test.js
/*
 const { uploadProductCSV } = require("../src/controllers/csvProductController");
const prisma = require("../src/config/prisma");

jest.mock("fs");
jest.mock("path");
jest.mock("csv-parser", () => () => jest.fn());
<<<<<<< HEAD
jest.mock("xlsx");
jest.mock("axios");
jest.mock("../config/prisma", () => mockPrisma);
jest.mock("../utils/mailer", () => ({ sendStockEmail: jest.fn() }));

const { sendStockEmail } = require("../utils/mailer");

describe("uploadProductCSV", () => {
    let req, res; 

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            file: { path: "test-file.xlsx" },
            headers: { authorization: "Bearer mocktoken" },
=======
jest.mock("p-limit", () => ({
    default: () => (fn) => fn,
}));

const fs = require("fs");
const path = require("path");

describe("uploadProductCSV", () => {
    let req, res;

    beforeEach(() => {
        req = {
            file: { path: "fake-path.csv" },
>>>>>>> 2adcd32021d0a0604210660bb9a20b57c81feaaf
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn(),
        };

<<<<<<< HEAD
        fs.existsSync.mockReturnValue(true);
        fs.createWriteStream.mockReturnValue({
            write: jest.fn(),
            end: jest.fn(),
        });
        const mockStream = {
            pipe: jest.fn().mockReturnThis(),
            on: jest.fn(function (event, cb) {
                if (event === "end") {
                    setImmediate(cb);
                }
                return this;
            }),
        };
        fs.createReadStream = jest.fn(() => mockStream);

        xlsx.readFile.mockReturnValue({
            SheetNames: ["Sheet1"],
            Sheets: {
                Sheet1: {},
            },
        });
        xlsx.utils.sheet_to_json.mockReturnValue([
            {
                id_producto: "P001",
                id_almacen: "A001",
                categoria: "Electrónicos",
                id_proveedor: "S001",
                nombre_producto: "TV",
                precio_unitario: "1000",
                peso_kg: "10",
                cantidad_stock: "50",
                nivel_reorden: "10",
                ultima_reposicion: "01/01/2024",
                fecha_vencimiento: "01/01/2025",
                estado: "activo",
            },
        ]);

        mockPrisma.warehouse.findMany.mockResolvedValue([{ id: "A001" }]);
        mockPrisma.supplier.findMany.mockResolvedValue([{ id: "S001" }]);
        mockPrisma.category.findMany.mockResolvedValue([{ id: "C001", name: "electrónicos" }]);
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.productWarehouse.findMany.mockResolvedValue([]);
        mockPrisma.productSupplier.findMany.mockResolvedValue([]);
        mockPrisma.product.createMany.mockResolvedValue({});
        mockPrisma.productWarehouse.createMany.mockResolvedValue({});
        mockPrisma.productSupplier.createMany.mockResolvedValue({});
        mockPrisma.productWarehouseMovement.createMany.mockResolvedValue({});
        sendStockEmail.mockResolvedValue(true);
        axios.get.mockResolvedValue({
            data: [{ email: "dispatcher@mail.com", role: { name: "Dispatcher" } }],
        });
    });

    it("debe importar productos correctamente desde CSV", async () => {
        await uploadProductCSV(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Importación completada",
                resumen: expect.any(Object),
            })
        );
    });

    it("debe retornar 400 si ocurre un error al leer el archivo", async () => {
        // Simula error en el archivo
        const mockStream = {
            pipe: jest.fn().mockReturnThis(),
            on: jest.fn(function (event, cb) {
                if (event === "error") {
                    setImmediate(() => cb(new Error("Error de lectura")));
                }
                if (event === "end") {
                    
                }
                return this;
            }),
        };
        fs.createReadStream.mockReturnValueOnce(mockStream);

        await uploadProductCSV(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.any(String),
            })
        );
    });
=======
        // Reset mocks
        fs.createReadStream.mockReset();
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockReset();

        // Mock de Prisma
        prisma.warehouse.findMany = jest.fn().mockResolvedValue([]);
        prisma.supplier.findMany = jest.fn().mockResolvedValue([]);
        prisma.category.findMany = jest.fn().mockResolvedValue([]);
        prisma.product.findMany = jest.fn().mockResolvedValue([]);
        prisma.productWarehouse.findMany = jest.fn().mockResolvedValue([]);
        prisma.productSupplier.findMany = jest.fn().mockResolvedValue([]);
        prisma.product.createMany = jest.fn().mockResolvedValue({});
        prisma.productWarehouse.createMany = jest.fn().mockResolvedValue({});
        prisma.productWarehouse.update = jest.fn().mockResolvedValue({});
        prisma.productSupplier.createMany = jest.fn().mockResolvedValue({});
        prisma.productWarehouseMovement.createMany = jest.fn().mockResolvedValue({});
    });

    it("debe retornar 201 si el proceso se completa correctamente", async () => {
        // Mocks para simular flujo
        fs.createReadStream.mockReturnValueOnce({
            pipe: jest.fn().mockReturnValueOnce({
                on: (event, cb) => {
                    if (event === "data") cb({ id_producto: "P001", id_almacen: "ALM001", categoria: "Electrónicos", id_proveedor: "PROV001", nombre_producto: "Producto X", precio_unitario: "1000", peso_kg: "1", cantidad_stock: "10", nivel_reorden: "2", ultima_reposicion: "10/04/2025", fecha_vencimiento: "10/12/2025", estado: "activo", dimensiones_cm: "10x10x10", sku: "SKU001", codigo_barras: "123456", requiere_refrigeracion: "false", es_fragil: "false" });
                    if (event === "end") cb();
                },
            }),
        });

        await uploadProductCSV(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Importación completada",
            resumen: expect.any(Object),
        }));
    });

    it("debe retornar 400 si ocurre un error", async () => {
        fs.createReadStream.mockImplementation(() => {
            throw new Error("Fallo en stream");
        });

        await uploadProductCSV(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Faltan o son inválidos campos requeridos",
        }));
    });
});

*/
// tests/csvProductController.test.js
// Mock de Prisma antes de importar el controlador
jest.mock("../config/prisma", () => ({
  warehouse: { findMany: jest.fn() },
  supplier: { findMany: jest.fn() },
  category: { findMany: jest.fn() },
  product: { findMany: jest.fn(), createMany: jest.fn() },
  productWarehouse: { findMany: jest.fn(), createMany: jest.fn(), update: jest.fn() },
  productSupplier: { findMany: jest.fn(), createMany: jest.fn() },
  productWarehouseMovement: { createMany: jest.fn() },
}));

const { uploadProductCSV } = require("../controllers/CsvProductController");
const prisma = require("../config/prisma");

jest.mock("fs");
jest.mock("path");
jest.mock("csv-parser", () => () => jest.fn());
jest.mock("p-limit", () => ({
  default: () => (fn) => fn,
}));

const fs = require("fs");
const path = require("path");

// Mock global para logStream
fs.createWriteStream.mockReturnValue({
  write: jest.fn(),
  end: jest.fn(),
});

describe("uploadProductCSV", () => {
  let req, res;

  beforeEach(() => {
    req = {
      file: { path: "fake-path.csv" },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };

    fs.existsSync.mockReturnValue(true);

    // Mock de stream compatible con .pipe().on()
    const fakeStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn(function (event, cb) {
        if (event === "data") {
          cb({
            id_producto: "P001",
            id_almacen: "ALM001",
            categoria: "Electrónicos",
            id_proveedor: "PROV001",
            nombre_producto: "Producto X",
            precio_unitario: "1000",
            peso_kg: "1",
            cantidad_stock: "10",
            nivel_reorden: "2",
            ultima_reposicion: "10/04/2025",
            fecha_vencimiento: "10/12/2025",
            estado: "activo",
            dimensiones_cm: "10x10x10",
            sku: "SKU001",
            codigo_barras: "123456",
            requiere_refrigeracion: "false",
            es_fragil: "false",
          });
        }
        if (event === "end") {
          cb();
        }
        return this;
      }),
    };
    fs.createReadStream.mockReturnValue(fakeStream);

    prisma.warehouse.findMany.mockResolvedValue([{ id: "ALM001" }]);
    prisma.supplier.findMany.mockResolvedValue([{ id: "PROV001" }]);
    prisma.category.findMany.mockResolvedValue([
      { id: "CAT001", name: "electrónicos" },
    ]);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.productWarehouse.findMany.mockResolvedValue([]);
    prisma.productSupplier.findMany.mockResolvedValue([]);
    prisma.product.createMany.mockResolvedValue({});
    prisma.productWarehouse.createMany.mockResolvedValue({});
    prisma.productWarehouse.update.mockResolvedValue({});
    prisma.productSupplier.createMany.mockResolvedValue({});
    prisma.productWarehouseMovement.createMany.mockResolvedValue({});
  });

  it("debe retornar 201 si el proceso se completa correctamente", async () => {
    await uploadProductCSV(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Importación completada",
        resumen: expect.any(Object),
      })
    );
  });

  it("debe retornar 400 si ocurre un error en la importación", async () => {
    fs.createReadStream.mockImplementationOnce(() => {
      throw new Error("Fallo en stream");
    });

    await uploadProductCSV(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Faltan o son inválidos campos requeridos",
      })
    );
  });
>>>>>>> 2adcd32021d0a0604210660bb9a20b57c81feaaf
});
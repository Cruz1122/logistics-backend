// __tests__/csvProductController.test.js
/*
 const { uploadProductCSV } = require("../src/controllers/csvProductController");
const prisma = require("../src/config/prisma");

jest.mock("fs");
jest.mock("path");
jest.mock("csv-parser", () => () => jest.fn());
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
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn(),
        };

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
});
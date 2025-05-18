// tests/CsvProductController.test.js

const { mockPrisma } = require("./__mocks__/prisma1");

const { uploadProductCSV } = require("../controllers/CsvProductController");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const xlsx = require("xlsx");

jest.mock("fs");
jest.mock("path");
jest.mock("csv-parser", () => () => jest.fn());
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
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn(),
        };

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
});
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const prisma = require("../config/prisma");

const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const createLogStream = () => {
  const logFileName = `products-errors-${new Date().toISOString().split("T")[0]}.log`;
  return fs.createWriteStream(path.join(logDir, logFileName), { flags: "a" });
};

const normalizeDecimal = (val) => parseFloat(String(val).replace(",", "."));

const uploadProductCSV = async (req, res) => {
  const filePath = req.file.path;
  const results = [];
  const logStream = createLogStream();

  fs.createReadStream(filePath, { encoding: "latin1" })
    .pipe(csv({ separator: ";" }))
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      try {
        const allWarehouses = await prisma.warehouse.findMany();

        for (const row of results) {
          const productId = row.id_producto?.trim();
          const warehouseId = row.id_almacen?.trim();
          const categoryName = row.categoria?.trim();
          const supplierId = row.id_proveedor?.trim();

          // Validación de almacén
          const warehouse = allWarehouses.find(w => w.id === warehouseId);
          if (!warehouse) {
            logStream.write(`[${new Date().toISOString()}] Error creando producto "${productId}" - Almacén "${warehouseId}" no existe\n`);
            continue;
          }

          // Creación o búsqueda de proveedor
          let supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
          if (!supplier) {
            try {
              supplier = await prisma.supplier.create({
                data: {
                  id: supplierId,
                  name: `Proveedor ${supplierId}`,
                  phone: "N/A",
                  email: `${supplierId.toLowerCase()}@fake.com`,
                },
              });
            } catch (err) {
              logStream.write(`[${new Date().toISOString()}] Error creando producto "${productId}" - No se pudo crear proveedor "${supplierId}": ${err.message}\n`);
              continue;
            }
          }

          // Creación o búsqueda de categoría
          let category = await prisma.category.findFirst({
            where: { name: { equals: categoryName, mode: "insensitive" } },
          });
          if (!category) {
            try {
              category = await prisma.category.create({
                data: {
                  name: categoryName,
                },
              });
            } catch (err) {
              logStream.write(`[${new Date().toISOString()}] Error creando producto "${productId}" - No se pudo crear categoría "${categoryName}": ${err.message}\n`);
              continue;
            }
          }

          // Crear producto + relaciones
          try {
            const newProduct = await prisma.product.create({
              data: {
                id: productId,
                name: row.nombre_producto?.trim(),
                description: row.descripcion?.trim(),
                categoryId: category.id,
                sku: row.sku?.trim(),
                barcode: row.codigo_barras?.trim(),
                unitPrice: normalizeDecimal(row.precio_unitario),
                weightKg: normalizeDecimal(row.peso_kg),
                dimensions: row.dimensiones_cm?.trim(),
                isFragile: row.es_fragil === "true",
                needsCooling: row.requiere_refrigeracion === "true",
              },
            });

            await prisma.productWarehouse.create({
              data: {
                productId: newProduct.id,
                warehouseId,
                stockQuantity: parseInt(row.cantidad_stock),
                reorderLevel: parseInt(row.nivel_reorden),
                lastRestock: new Date(row.ultima_reposicion),
                expirationDate: row.fecha_vencimiento ? new Date(row.fecha_vencimiento) : new Date("2100-01-01"),
                status: row.estado?.trim(),
              },
            });

            await prisma.productSupplier.create({
              data: {
                productId: newProduct.id,
                supplierId: supplier.id,
              },
            });

          } catch (err) {
            logStream.write(`[${new Date().toISOString()}] Error creando producto "${productId}" - ${err.message}\n`);
          }
        }

        logStream.end();
        res.status(201).json({ message: "Importación de productos completada" });
      } catch (err) {
        console.error("Error general en importación:", err);
        res.status(500).json({ error: "Fallo la importación de productos" });
      }
    });
};

module.exports = { uploadProductCSV };

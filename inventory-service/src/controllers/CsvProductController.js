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

// 👉 Función para convertir fecha "DD/MM/YYYY" a objeto Date válido
const parseCsvDate = (rawDate) => {
  if (!rawDate) return null;

  const clean = rawDate.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  const [day, month, year] = clean.split("/");

  if (!day || !month || !year) return null;

  const isoFormat = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsedDate = new Date(isoFormat);

  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

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

          const warehouse = allWarehouses.find(w => w.id === warehouseId);
          if (!warehouse) {
            logStream.write(`[${new Date().toISOString()}] Error creando producto "${productId}" - Almacén "${warehouseId}" no existe\n`);
            continue;
          }

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

          // Crear producto
          try {
            await prisma.product.create({
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
          } catch (err) {
            logStream.write(`[${new Date().toISOString()}] Error creando producto "${productId}" - Producto ya existe o datos inválidos\n`);
            continue;
          }

          // Crear relación producto-almacén
          try {
            const newProduct = await prisma.product.findUnique({
              where: { id: productId },
            });

            await prisma.productWarehouse.create({
              data: {
                productId: newProduct.id,
                warehouseId,
                stockQuantity: parseInt(row.cantidad_stock),
                reorderLevel: parseInt(row.nivel_reorden),
                lastRestock: parseCsvDate(row.ultima_reposicion) ?? new Date(),
                expirationDate: parseCsvDate(row.fecha_vencimiento) ?? new Date("2100-01-01"),
                status: row.estado?.trim(),
              },
            });
          } catch (err) {
            logStream.write(`[${new Date().toISOString()}] Error creando relación producto-almacén para "${productId}" - ${err.message}\n`);
            continue;
          }

          // Crear relación producto-proveedor
          try {
            await prisma.productSupplier.create({
              data: {
                productId: productId,
                supplierId: supplier.id,
              },
            });
          } catch (err) {
            logStream.write(`[${new Date().toISOString()}] Error creando relación producto-proveedor para "${productId}" - ${err.message}\n`);
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

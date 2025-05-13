const fs = require("fs");
const csv = require("csv-parser");
const prisma = require("../config/prisma");

const uploadProductCSV = async (req, res) => {
  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath, { encoding: "utf8" }) // asegúrate de leer como utf8
    .pipe(csv())
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      try {
        // Preload almacenes y categorías
        const warehouses = await prisma.warehouse.findMany();
        const warehouseMap = new Map(); // Mapea ALM001 -> warehouseId real
        warehouses.forEach((w, i) => {
          warehouseMap.set(`ALM00${i + 1}`, w.id);
        });

        const categories = await prisma.category.findMany();
        const categoryMap = new Map(); // Mapea nombre (decodificado) -> categoryId
        categories.forEach((c) => {
          categoryMap.set(c.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), c.id);
        });

        for (const row of results) {
          const warehouseId = warehouseMap.get(row.id_almacen);
          if (!warehouseId) {
            throw new Error(`No se encontró warehouse para id_almacen: ${row.id_almacen}`);
          }

          const categoriaNombre = row.categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remueve acentos rotos
          const categoryId = categoryMap.get(categoriaNombre);
          if (!categoryId) {
            throw new Error(`No se encontró categoría para: ${row.categoria}`);
          }

          const product = await prisma.product.create({
            data: {
              name: row.nombre_prod,
              sku: row.codigo_barra,
              barcode: row.codigo_barra,
              description: row.descripcion,
              categoryId,
              unitPrice: parseFloat(row.precio_unitario),
              weightKg: parseFloat(row.peso_kg),
              dimensions: row.dimensiones,
              isFragile: row.es_fragil === "true",
              needsCooling: row.requiere_refri === "true",
            },
          });

          await prisma.productWarehouse.create({
            data: {
              productId: product.id,
              warehouseId,
              stockQuantity: parseInt(row.cantidad_stock),
              reorderLevel: parseInt(row.nivel_reorden),
              lastRestock: new Date(),
              expirationDate: new Date(row.fecha_vencimiento),
              status: row.estado,
            },
          });
        }

        res.status(201).json({ message: "Product imported", count: results.length });
      } catch (error) {
        console.error("Inventory import error:", error);
        res.status(500).json({ error: "Import failed", detail: error.message });
      }
    });
};

module.exports = { uploadProductCSV };

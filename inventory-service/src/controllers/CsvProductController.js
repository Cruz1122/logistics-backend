const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const prisma = require("../config/prisma");
const pLimit = require("p-limit");

const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const createLogStream = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const logFileName = `products-log-${date}_${time}.log`;
  return fs.createWriteStream(path.join(logDir, logFileName), { flags: "a" });
};

const normalizeDecimal = (val) => parseFloat(String(val).replace(",", "."));

const parseCsvDate = (rawDate) => {
  if (!rawDate) return null;
  const clean = rawDate.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  const [day, month, year] = clean.split("/");
  if (!day || !month || !year) return null;
  const isoFormat = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsedDate = new Date(isoFormat);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const BATCH_SIZE = 500;

const uploadProductCSV = async (req, res) => {
  const filePath = req.file.path;
  const results = [];
  const logStream = createLogStream();

  const log = (msg) => {
    const timestamp = `[${new Date().toISOString()}] `;
    console.log(timestamp + msg);
    logStream.write(timestamp + msg + "\n");
  };

  try {
    log("Inicio de lectura del archivo CSV.");
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: "latin1" })
        .pipe(csv({ separator: ";" }))
        .on("data", (row) => results.push(row))
        .on("end", () => {
          log(
            `Archivo CSV leído completamente. Filas leídas: ${results.length}`
          );
          resolve();
        })
        .on("error", (err) => {
          log(`Error leyendo CSV: ${err.message}`);
          reject(err);
        });
    });

    // Cargas previas (warehouses, suppliers, categories, products, productWarehouse)
    log("Cargando almacenes...");
    const allWarehouses = await prisma.warehouse.findMany();
    const warehouseMap = new Map(allWarehouses.map((w) => [w.id, w]));
    log(`  → ${allWarehouses.length} almacenes cargados`);

    log("Cargando proveedores existentes...");
    const supplierIds = [
      ...new Set(results.map((r) => r.id_proveedor?.trim()).filter(Boolean)),
    ];
    const existingSuppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
    });
    const supplierMap = new Map(existingSuppliers.map((s) => [s.id, s]));
    log(`  → ${existingSuppliers.length} proveedores encontrados`);

    log("Creando proveedores nuevos si faltan...");
    const newSupplierIds = supplierIds.filter((id) => !supplierMap.has(id));
    if (newSupplierIds.length) {
      log(`  → ${newSupplierIds.length} proveedores nuevos a crear`);
      await prisma.supplier.createMany({
        data: newSupplierIds.map((id) => ({
          id,
          name: `Proveedor ${id}`,
          phone: "N/A",
          email: `${id.toLowerCase()}@fake.com`,
        })),
        skipDuplicates: true,
      });
      const refreshedSuppliers = await prisma.supplier.findMany({
        where: { id: { in: newSupplierIds } },
      });
      refreshedSuppliers.forEach((s) => supplierMap.set(s.id, s));
      log(`  → ${refreshedSuppliers.length} proveedores nuevos creados`);
    }

    log("Cargando categorías existentes...");
    const categoryNames = [
      ...new Set(
        results.map((r) => r.categoria?.trim().toLowerCase()).filter(Boolean)
      ),
    ];
    const existingCategories = await prisma.category.findMany({
      where: { name: { in: categoryNames } },
    });
    const categoryMap = new Map(
      existingCategories.map((c) => [c.name.toLowerCase(), c])
    );
    log(`  → ${existingCategories.length} categorías encontradas`);

    log("Creando categorías nuevas si faltan...");
    const newCategoryNames = categoryNames.filter(
      (name) => !categoryMap.has(name)
    );
    if (newCategoryNames.length) {
      log(`  → ${newCategoryNames.length} categorías nuevas a crear`);
      await prisma.category.createMany({
        data: newCategoryNames.map((name) => ({ name })),
        skipDuplicates: true,
      });
      const refreshedCategories = await prisma.category.findMany({
        where: { name: { in: newCategoryNames } },
      });
      refreshedCategories.forEach((c) =>
        categoryMap.set(c.name.toLowerCase(), c)
      );
      log(`  → ${refreshedCategories.length} categorías nuevas creadas`);
    }

    log("Cargando productos existentes...");
    const productIds = [
      ...new Set(results.map((r) => r.id_producto?.trim()).filter(Boolean)),
    ];
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(existingProducts.map((p) => [p.id, p]));
    log(`  → ${existingProducts.length} productos encontrados`);

    log("Cargando relaciones productWarehouse existentes...");
    const productWarehouseKeys = results
      .map((r) => ({
        productId: r.id_producto?.trim(),
        warehouseId: r.id_almacen?.trim(),
      }))
      .filter(({ productId, warehouseId }) => productId && warehouseId);
    const uniquePWKeys = Array.from(
      new Set(
        productWarehouseKeys.map((k) => `${k.productId}||${k.warehouseId}`)
      )
    ).map((str) => {
      const [productId, warehouseId] = str.split("||");
      return { productId, warehouseId };
    });
    const existingPWs = await prisma.productWarehouse.findMany({
      where: { OR: uniquePWKeys },
    });
    const pwMap = new Map(
      existingPWs.map((pw) => [`${pw.productId}||${pw.warehouseId}`, pw])
    );
    log(`  → ${existingPWs.length} productWarehouses encontrados`);

    log("Cargando relaciones productSupplier existentes (solo las del CSV)...");
    const productSupplierPairs = Array.from(
      new Set(
        results
          .map((r) => {
            const pid = r.id_producto?.trim();
            const sid = r.id_proveedor?.trim();
            return pid && sid ? `${pid}||${sid}` : null;
          })
          .filter(Boolean)
      )
    ).map((str) => {
      const [productId, supplierId] = str.split("||");
      return { productId, supplierId };
    });
    log(
      `  → ${productSupplierPairs.length} parejas product-supplier a verificar`
    );
    const existingPS = await prisma.productSupplier.findMany({
      where: { OR: productSupplierPairs },
    });
    const psSet = new Set(
      existingPS.map((ps) => `${ps.productId}||${ps.supplierId}`)
    );
    log(`  → ${existingPS.length} relaciones productSupplier existentes`);

    // Contadores resumen
    let totalProductsCreated = 0;
    let totalSuppliersCreated = newSupplierIds.length;
    let totalCategoriesCreated = newCategoryNames.length;
    let totalPWCreated = 0;
    let totalPWUpdated = 0;
    let totalPSCreated = 0;
    let totalMovementsCreated = 0;

    const movementsToCreate = [];
    const productSupplierToCreate = [];

    log("Procesando registros por batches...");
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      log(`  Batch ${i + 1} a ${i + batch.length}`);

      const newProductsData = [];
      const pwsToCreate = [];
      const pwsToUpdate = [];

      for (const row of batch) {
        const productId = row.id_producto?.trim();
        const warehouseId = row.id_almacen?.trim();

        // Validar existencia de IDs
        if (!productId || !warehouseId || !warehouseMap.has(warehouseId)) {
          log(`    ► Almacén inválido para producto "${productId}"`);
          continue;
        }

        // Validar y obtener supplier y category
        const supplierId = row.id_proveedor?.trim();
        const supplier = supplierMap.get(supplierId) || null;
        const catName = row.categoria?.trim().toLowerCase();
        const category = categoryMap.get(catName) || null;

        if (supplierId && !supplier) {
          log(`    ► Proveedor inválido para producto "${productId}"`);
          continue;
        }
        if (catName && !category) {
          log(`    ► Categoría inválida para producto "${productId}"`);
          continue;
        }

        // Si el producto no existe, VALIDAR TODOS LOS CAMPOS REQUERIDOS
        let product = productMap.get(productId);
        if (!product) {
          const name = row.nombre_producto?.trim();
          const priceRaw = row.precio_unitario;
          const weightRaw = row.peso_kg;
          if (!name || priceRaw == null || weightRaw == null) {
            throw new Error(
              `Faltan campos requeridos para producto "${productId}": nombre, precio_unitario o peso_kg`
            );
          }
          const unitPrice = normalizeDecimal(priceRaw);
          const weightKg = normalizeDecimal(weightRaw);
          if (isNaN(unitPrice) || isNaN(weightKg)) {
            throw new Error(
              `Campos inválidos para producto "${productId}": precio_unitario o peso_kg no son numéricos`
            );
          }

          newProductsData.push({
            id: productId,
            name,
            description: row.descripcion?.trim() || "",
            categoryId: category?.id,
            sku: row.sku?.trim() || "",
            barcode: row.codigo_barras?.trim() || "",
            unitPrice,
            weightKg,
            dimensions: row.dimensiones_cm?.trim() || "",
            isFragile: row.es_fragil === "true",
            needsCooling: row.requiere_refrigeracion === "true",
          });
        }

        // Preparar productWarehouse create/update
        const pwKey = `${productId}||${warehouseId}`;
        const existPW = pwMap.get(pwKey);
        const stockQty = parseInt(row.cantidad_stock) || 0;
        const reorderLvl = parseInt(row.nivel_reorden) || 0;
        const lastRestock = parseCsvDate(row.ultima_reposicion) || new Date();
        const expDate =
          parseCsvDate(row.fecha_vencimiento) || new Date("2100-01-01");
        const status = row.estado?.trim() || "";

        if (existPW) {
          pwsToUpdate.push({
            id: existPW.id,
            stockQuantity: stockQty,
            reorderLevel: reorderLvl,
            lastRestock,
            expirationDate: expDate,
            status,
            prevStock: existPW.stockQuantity || 0,
          });
        } else {
          pwsToCreate.push({
            productId,
            warehouseId,
            stockQuantity: stockQty,
            reorderLevel: reorderLvl,
            lastRestock,
            expirationDate: expDate,
            status,
          });
        }

        // Relación product-supplier
        if (supplier && !psSet.has(`${productId}||${supplier.id}`)) {
          productSupplierToCreate.push({ productId, supplierId: supplier.id });
          psSet.add(`${productId}||${supplier.id}`);
        }
      }

      // Crear productos nuevos
      if (newProductsData.length) {
        log(`    ► Creando ${newProductsData.length} productos`);
        await prisma.product.createMany({
          data: newProductsData,
          skipDuplicates: true,
        });
        totalProductsCreated += newProductsData.length;
        newProductsData.forEach((p) => productMap.set(p.id, p));
      }

      // Actualizar PWs existentes
      for (const pw of pwsToUpdate) {
        log(`    ► Actualizando PW id=${pw.id}`);
        await prisma.productWarehouse.update({
          where: { id: pw.id },
          data: {
            stockQuantity: pw.stockQuantity,
            reorderLevel: pw.reorderLevel,
            lastRestock: pw.lastRestock,
            expirationDate: pw.expirationDate,
            status: pw.status,
          },
        });
        totalPWUpdated++;
        if (pw.stockQuantity !== pw.prevStock) {
          movementsToCreate.push({
            productWarehouseId: pw.id,
            movementType: "UPDATE",
            quantityMoved: pw.stockQuantity - pw.prevStock,
            stockAfter: pw.stockQuantity,
            notes: "Actualización por carga masiva",
          });
        }
      }

      // Crear PWs nuevas
      if (pwsToCreate.length) {
        log(`    ► Creando ${pwsToCreate.length} PWs nuevas`);
        await prisma.productWarehouse.createMany({
          data: pwsToCreate,
          skipDuplicates: true,
        });
        totalPWCreated += pwsToCreate.length;

        // Obtener IDs para movimientos
        const createdPWs = await prisma.productWarehouse.findMany({
          where: {
            OR: pwsToCreate.map(({ productId, warehouseId }) => ({
              productId,
              warehouseId,
            })),
          },
        });
        createdPWs.forEach((pw) => {
          movementsToCreate.push({
            productWarehouseId: pw.id,
            movementType: "CREATION",
            quantityMoved: pw.stockQuantity,
            stockAfter: pw.stockQuantity,
            notes: "Creación por carga masiva",
          });
          pwMap.set(`${pw.productId}||${pw.warehouseId}`, pw);
        });
      }

      // Crear relaciones productSupplier nuevas
      if (productSupplierToCreate.length) {
        log(
          `    ► Creando ${productSupplierToCreate.length} relaciones productSupplier`
        );
        await prisma.productSupplier.createMany({
          data: productSupplierToCreate,
          skipDuplicates: true,
        });
        totalPSCreated += productSupplierToCreate.length;
        productSupplierToCreate.length = 0;
      }
    }

    // Crear movimientos acumulados
    if (movementsToCreate.length) {
      log(`Creando ${movementsToCreate.length} movimientos de inventario`);
      for (let i = 0; i < movementsToCreate.length; i += BATCH_SIZE) {
        const batchMovs = movementsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.productWarehouseMovement.createMany({ data: batchMovs });
        totalMovementsCreated += batchMovs.length;
      }
    }

    log("Importación completada exitosamente.");
    logStream.end();

    // Resumen final en respuesta
    res.status(201).json({
      message: "Importación completada",
      resumen: {
        productosCreados: totalProductsCreated,
        proveedoresCreados: totalSuppliersCreated,
        categoriasCreadas: totalCategoriesCreated,
        productWarehousesCreados: totalPWCreated,
        productWarehousesActualizados: totalPWUpdated,
        relacionesProductSupplierCreadas: totalPSCreated,
        movimientosRegistrados: totalMovementsCreated,
      },
    });
  } catch (err) {
    console.error("Error general en importación:", err.message);
    logStream.write(`[${new Date().toISOString()}] ERROR: ${err.message}\n`);
    logStream.end();
    res.status(400).json({
      error: "Faltan o son inválidos campos requeridos",
      detalle: err.message,
    });
  }
};

module.exports = { uploadProductCSV };

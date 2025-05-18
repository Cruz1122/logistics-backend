const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const axios = require("axios");
const prisma = require("../config/prisma");
const { sendStockEmail } = require("../utils/mailer");

let pLimit;
(async () => {
  pLimit = (await import("p-limit")).default;
})();

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
  const clean = String(rawDate ?? "")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
  const [day, month, year] = clean.split("/");
  if (!day || !month || !year) return null;
  const isoFormat = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsedDate = new Date(isoFormat);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const BATCH_SIZE = 500;

// --- Helpers ---
async function readFile(filePath, log) {
  const results = [];
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: "latin1" })
        .pipe(csv({ separator: ";" }))
        .on("data", (row) => results.push(row))
        .on("end", () => {
          log(
            `→ Archivo CSV leído completamente. Filas leídas: ${results.length}`
          );
          resolve();
        })
        .on("error", (err) => {
          log(`Error leyendo CSV: ${err.message}`);
          reject(err);
        });
    });
  } else if (ext === ".xls" || ext === ".xlsx") {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    data.forEach((row) => results.push(row));
    log(`→ Archivo Excel leído completamente. Filas leídas: ${results.length}`);
  } else {
    throw new Error(
      "Formato de archivo no soportado. Solo CSV y Excel (.xls, .xlsx)"
    );
  }

  return results;
}

async function loadWarehouses(log) {
  log("Cargando almacenes...");
  const allWarehouses = await prisma.warehouse.findMany();
  const warehouseMap = new Map(allWarehouses.map((w) => [w.id, w]));
  log(`→ ${allWarehouses.length} almacenes cargados`);
  return warehouseMap;
}

async function loadSuppliers(results, log) {
  log("Cargando proveedores existentes...");
  const supplierIds = [
    ...new Set(
      results.map((r) => String(r.id_proveedor ?? "").trim()).filter(Boolean)
    ),
  ];
  const existingSuppliers = await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
  });
  const supplierMap = new Map(existingSuppliers.map((s) => [s.id, s]));
  log(`→ ${existingSuppliers.length} proveedores encontrados`);

  // Crear proveedores nuevos
  const newSupplierIds = supplierIds.filter((id) => !supplierMap.has(id));
  if (newSupplierIds.length) {
    log(`→ ${newSupplierIds.length} proveedores nuevos a crear`);
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
    log(`→ ${refreshedSuppliers.length} proveedores nuevos creados`);
  }

  return { supplierMap, totalSuppliersCreated: newSupplierIds.length };
}

async function loadCategories(results, log) {
  log("Cargando categorías existentes...");
  const categoryNames = [
    ...new Set(
      results
        .map((r) =>
          String(r.categoria ?? "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ),
  ];
  const existingCategories = await prisma.category.findMany({
    where: { name: { in: categoryNames } },
  });
  const categoryMap = new Map(
    existingCategories.map((c) => [c.name.toLowerCase(), c])
  );
  log(`→ ${existingCategories.length} categorías encontradas`);

  // Crear categorías nuevas
  const newCategoryNames = categoryNames.filter(
    (name) => !categoryMap.has(name)
  );
  if (newCategoryNames.length) {
    log(`→ ${newCategoryNames.length} categorías nuevas a crear`);
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
    log(`→ ${refreshedCategories.length} categorías nuevas creadas`);
  }

  return { categoryMap, totalCategoriesCreated: newCategoryNames.length };
}

async function loadProducts(results, log) {
  log("Cargando productos existentes...");
  const productIds = [
    ...new Set(
      results.map((r) => String(r.id_producto ?? "").trim()).filter(Boolean)
    ),
  ];
  const existingProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(existingProducts.map((p) => [p.id, p]));
  log(`→ ${existingProducts.length} productos encontrados`);
  return productMap;
}

async function loadProductWarehouses(results, log) {
  log("Cargando relaciones productWarehouse existentes...");
  const productWarehouseKeys = results
    .map((r) => ({
      productId: String(r.id_producto ?? "").trim(),
      warehouseId: String(r.id_almacen ?? "").trim(),
    }))
    .filter(({ productId, warehouseId }) => productId && warehouseId);
  const uniquePWKeys = Array.from(
    new Set(productWarehouseKeys.map((k) => `${k.productId}||${k.warehouseId}`))
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
  log(`→ ${existingPWs.length} productWarehouses encontrados`);
  return pwMap;
}

async function loadProductSuppliers(results, log) {
  log("Cargando relaciones productSupplier existentes (solo las del CSV)...");
  const productSupplierPairs = Array.from(
    new Set(
      results
        .map((r) => {
          const pid = String(r.id_producto ?? "").trim();
          const sid = String(r.id_proveedor ?? "").trim();
          return pid && sid ? `${pid}||${sid}` : null;
        })
        .filter(Boolean)
    )
  ).map((str) => {
    const [productId, supplierId] = str.split("||");
    return { productId, supplierId };
  });
  log(`→ ${productSupplierPairs.length} parejas product-supplier a verificar`);
  const existingPS = await prisma.productSupplier.findMany({
    where: { OR: productSupplierPairs },
  });
  const psSet = new Set(
    existingPS.map((ps) => `${ps.productId}||${ps.supplierId}`)
  );
  log(`→ ${existingPS.length} relaciones productSupplier existentes`);
  return psSet;
}

function isValidWarehouse(productId, warehouseId, warehouseMap, log) {
  if (!productId || !warehouseId || !warehouseMap.has(warehouseId)) {
    log(`  ► Almacén inválido para producto "${productId}"`);
    return false;
  }
  return true;
}

function isValidSupplier(supplierId, supplier, productId, log) {
  if (supplierId && !supplier) {
    log(`  ► Proveedor inválido para producto "${productId}"`);
    return false;
  }
  return true;
}

function isValidCategory(catName, category, productId, log) {
  if (catName && !category) {
    log(`  ► Categoría inválida para producto "${productId}"`);
    return false;
  }
  return true;
}

function buildNewProduct(row, productId, category) {
  const name = String(row.nombre_producto ?? "").trim();
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

  return {
    id: productId,
    name,
    description: String(row.descripcion ?? "").trim(),
    categoryId: category?.id,
    sku: String(row.sku ?? "").trim(),
    barcode: String(row.codigo_barras ?? "").trim(),
    unitPrice,
    weightKg,
    dimensions: String(row.dimensiones_cm ?? "").trim(),
    isFragile: String(row.es_fragil ?? "").trim() === "true",
    needsCooling: String(row.requiere_refrigeracion ?? "").trim() === "true",
  };
}

function buildPWUpdate(existPW, row, lastRestock, expDate, status) {
  const stockQty = parseInt(row.cantidad_stock) || 0;
  const reorderLvl = parseInt(row.nivel_reorden) || 0;
  return {
    id: existPW.id,
    productId: existPW.productId,
    warehouseId: existPW.warehouseId,
    stockQuantity: stockQty,
    reorderLevel: reorderLvl,
    lastRestock,
    expirationDate: expDate,
    status,
    prevStock: existPW.stockQuantity || 0,
  };
}

function buildPWCreate(
  productId,
  warehouseId,
  row,
  lastRestock,
  expDate,
  status
) {
  const stockQty = parseInt(row.cantidad_stock) || 0;
  const reorderLvl = parseInt(row.nivel_reorden) || 0;
  return {
    productId,
    warehouseId,
    stockQuantity: stockQty,
    reorderLevel: reorderLvl,
    lastRestock,
    expirationDate: expDate,
    status,
  };
}

async function processBatch({
  batch,
  warehouseMap,
  supplierMap,
  categoryMap,
  productMap,
  pwMap,
  psSet,
  log,
}) {
  const newProductsData = [];
  const pwsToCreate = [];
  const pwsToUpdate = [];
  const productSupplierToCreate = [];
  const movementsToCreate = [];

  for (const row of batch) {
    const productId = String(row.id_producto ?? "").trim();
    const warehouseId = String(row.id_almacen ?? "").trim();

    if (!isValidWarehouse(productId, warehouseId, warehouseMap, log)) continue;

    const supplierId = String(row.id_proveedor ?? "").trim();
    const supplier = supplierMap.get(supplierId) || null;
    const catName = String(row.categoria ?? "")
      .trim()
      .toLowerCase();
    const category = categoryMap.get(catName) || null;

    if (!isValidSupplier(supplierId, supplier, productId, log)) continue;
    if (!isValidCategory(catName, category, productId, log)) continue;

    let product = productMap.get(productId);
    if (!product) {
      newProductsData.push(buildNewProduct(row, productId, category));
    }

    const pwKey = `${productId}||${warehouseId}`;
    const existPW = pwMap.get(pwKey);
    const lastRestock = parseCsvDate(row.ultima_reposicion) || new Date();
    const expDate =
      parseCsvDate(row.fecha_vencimiento) || new Date("2100-01-01");
    const status = String(row.estado ?? "").trim();

    if (existPW) {
      pwsToUpdate.push(
        buildPWUpdate(existPW, row, lastRestock, expDate, status)
      );
    } else {
      pwsToCreate.push(
        buildPWCreate(productId, warehouseId, row, lastRestock, expDate, status)
      );
    }

    if (supplier && !psSet.has(`${productId}||${supplier.id}`)) {
      productSupplierToCreate.push({ productId, supplierId: supplier.id });
      psSet.add(`${productId}||${supplier.id}`);
    }
  }

  return {
    newProductsData,
    pwsToCreate,
    pwsToUpdate,
    productSupplierToCreate,
    movementsToCreate,
  };
}

// --- Función principal de procesamiento por batches ---
// Helper for updating existing product warehouses
async function updateProductWarehouses(pwsToUpdate, prisma, log, movementsToCreate, lowStockAlerts, totalPWUpdated) {
  for (const pw of pwsToUpdate) {
    log(`  ► Actualizando PW id=${pw.id}`);
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
    totalPWUpdated.count++;
    if (pw.stockQuantity !== pw.prevStock) {
      movementsToCreate.push({
        productWarehouseId: pw.id,
        movementType: "UPDATE",
        quantityMoved: pw.stockQuantity - pw.prevStock,
        stockAfter: pw.stockQuantity,
        notes: "Actualización por carga masiva",
      });
    }
    // Alerta stock bajo si aplica
    if (pw.reorderLevel && pw.stockQuantity <= pw.reorderLevel) {
      lowStockAlerts.push({
        productId: pw.productId,
        warehouseId: pw.warehouseId,
        stockQuantity: pw.stockQuantity,
        reorderLevel: pw.reorderLevel,
      });
    }
  }
}

// Helper for creating new product warehouses
async function createProductWarehouses(pwsToCreate, prisma, log, pwMap, movementsToCreate, lowStockAlerts, totalPWCreated) {
  if (pwsToCreate.length) {
    log(`  ► Creando ${pwsToCreate.length} PWs nuevas`);
    await prisma.productWarehouse.createMany({
      data: pwsToCreate,
      skipDuplicates: true,
    });
    totalPWCreated.count += pwsToCreate.length;

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
      // Alerta stock bajo si aplica
      if (pw.reorderLevel && pw.stockQuantity <= pw.reorderLevel) {
        lowStockAlerts.push({
          productId: pw.productId,
          warehouseId: pw.warehouseId,
          stockQuantity: pw.stockQuantity,
          reorderLevel: pw.reorderLevel,
        });
      }
    });
  }
}

async function processBatches({
  results,
  warehouseMap,
  supplierMap,
  categoryMap,
  productMap,
  pwMap,
  psSet,
  log,
  prisma,
  BATCH_SIZE,
  lowStockAlerts,
}) {
  let totalProductsCreated = 0;
  let totalPWCreated = { count: 0 };
  let totalPWUpdated = { count: 0 };
  let totalPSCreated = 0;
  const movementsToCreate = [];

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    log(`  Batch ${i + 1} a ${i + batch.length}`);

    const {
      newProductsData,
      pwsToCreate,
      pwsToUpdate,
      productSupplierToCreate,
    } = await processBatch({
      batch,
      warehouseMap,
      supplierMap,
      categoryMap,
      productMap,
      pwMap,
      psSet,
      log,
    });

    // Crear productos nuevos
    if (newProductsData.length) {
      log(`  ► Creando ${newProductsData.length} productos`);
      await prisma.product.createMany({
        data: newProductsData,
        skipDuplicates: true,
      });
      totalProductsCreated += newProductsData.length;
      newProductsData.forEach((p) => productMap.set(p.id, p));
    }

    // Actualizar PWs existentes
    await updateProductWarehouses(
      pwsToUpdate,
      prisma,
      log,
      movementsToCreate,
      lowStockAlerts,
      totalPWUpdated
    );

    // Crear PWs nuevas
    await createProductWarehouses(
      pwsToCreate,
      prisma,
      log,
      pwMap,
      movementsToCreate,
      lowStockAlerts,
      totalPWCreated
    );

    // Crear relaciones productSupplier nuevas
    if (productSupplierToCreate.length) {
      log(
        `  ► Creando ${productSupplierToCreate.length} relaciones productSupplier`
      );
      await prisma.productSupplier.createMany({
        data: productSupplierToCreate,
        skipDuplicates: true,
      });
      totalPSCreated += productSupplierToCreate.length;
      productSupplierToCreate.length = 0;
    }
  }

  return {
    totalProductsCreated,
    totalPWCreated: totalPWCreated.count,
    totalPWUpdated: totalPWUpdated.count,
    totalPSCreated,
    movementsToCreate,
  };
}

// --- Endpoint de subida e importación ---
const uploadProductCSV = async (req, res) => {
  const filePath = req.file.path;
  const lowStockAlerts = [];
  const logStream = createLogStream();
  const log = (msg) => {
    const timestamp = `[${new Date().toISOString()}] `;
    console.log(timestamp + msg);
    logStream.write(timestamp + msg + "\n");
  };

  try {
    log("Inicio de lectura del archivo.");

    const results = await readFile(filePath, log);

    const warehouseMap = await loadWarehouses(log);
    const { supplierMap, totalSuppliersCreated } = await loadSuppliers(
      results,
      log
    );
    const { categoryMap, totalCategoriesCreated } = await loadCategories(
      results,
      log
    );
    const productMap = await loadProducts(results, log);
    const pwMap = await loadProductWarehouses(results, log);
    const psSet = await loadProductSuppliers(results, log);

    log("Procesando registros por batches...");
    const {
      totalProductsCreated,
      totalPWCreated,
      totalPWUpdated,
      totalPSCreated,
      movementsToCreate,
    } = await processBatches({
      results,
      warehouseMap,
      supplierMap,
      categoryMap,
      productMap,
      pwMap,
      psSet,
      log,
      prisma,
      BATCH_SIZE,
      lowStockAlerts,
    });

    // Crear movimientos acumulados
    let totalMovementsCreated = 0;
    if (movementsToCreate.length) {
      log(`Creando ${movementsToCreate.length} movimientos de inventario`);
      for (let i = 0; i < movementsToCreate.length; i += BATCH_SIZE) {
        const batchMovs = movementsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.productWarehouseMovement.createMany({ data: batchMovs });
        totalMovementsCreated += batchMovs.length;
      }
    }

    // Envío de alertas de stock bajo
    if (lowStockAlerts.length) {
      log(`→ Detectados ${lowStockAlerts.length} productos con stock bajo`);

      let dispatchers = [];
      try {
        const response = await axios.get(
          `${process.env.AUTH_URL}/users/users/`,
          { headers: { Authorization: req.headers.authorization || "" } }
        );
        dispatchers = response.data.filter(
          (u) => u.role?.name === "Dispatcher"
        );
      } catch (err) {
        console.error("Error fetching dispatchers from auth-service:", err);
      }

      if (dispatchers.length) {
        const dispatchEmails = dispatchers.map((u) => u.email);
        const subject = "Low Stock Products Report";
        const message = `
          <h3>The following products need to be restocked as soon as possible:</h3>
          <div style="text-align:center;">
            <table border="1" cellspacing="0" cellpadding="4" style="margin: 0 auto;">
              <thead>
          <tr>
            <th>Product ID</th>
            <th>Warehouse ID</th>
            <th>Stock</th>
            <th>Reorder Level</th>
          </tr>
              </thead>
              <tbody>
          ${lowStockAlerts
            .map(
              (a) => `
            <tr>
              <td>${a.productId}</td>
              <td>${a.warehouseId}</td>
              <td>${a.stockQuantity}</td>
              <td>${a.reorderLevel}</td>
            </tr>
          `
            )
            .join("")}
              </tbody>
            </table>
            <br>
            <strong>Total products needing restock: ${
              lowStockAlerts.length
            }</strong>
            <br>Please take action. This is an automated message, please do not reply.
          </div>
        `;

        const emailSent = await sendStockEmail(
          dispatchEmails,
          subject,
          message
        );
        if (emailSent) log("→ Alerta de stock bajo enviada a los dispatchers.");
        else log("→ No se pudo enviar la alerta de stock bajo.");
      }
    }

    log("Importación completada exitosamente.");
    logStream.end();

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
        alertasStockBajo: lowStockAlerts.length,
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

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const axios = require("axios");
const prisma = require("../config/prisma");
const { sendStockEmail } = require("../utils/mailer");

// Import p-limit dynamically to avoid circular dependency issues
// This allows us to use p-limit for concurrency control in batch processing
let pLimit;
(async () => {
  pLimit = (await import("p-limit")).default;
})();

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Create a log stream with a timestamped filename
const createLogStream = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const logFileName = `products-log-${date}_${time}.log`;
  return fs.createWriteStream(path.join(logDir, logFileName), { flags: "a" });
};

// Functions to normalize decimal values and parse dates
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

// Batch size for processing records
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
            `→ CSV file read completely. Rows read: ${results.length}`
          );
          resolve();
        })
        .on("error", (err) => {
          log(`Error reading CSV: ${err.message}`);
          reject(err);
        });
    });
  } else if (ext === ".xls" || ext === ".xlsx") {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    data.forEach((row) => results.push(row));
    log(`→ Excel file read completely. Rows read: ${results.length}`);
  } else {
    throw new Error(
      "Unsupported file format. Only CSV and Excel (.xls, .xlsx) are allowed"
    );
  }

  return results;
}

// Load existing warehouses into a map for quick access
async function loadWarehouses(log) {
  log("Loading warehouses...");
  const allWarehouses = await prisma.warehouse.findMany();
  const warehouseMap = new Map(allWarehouses.map((w) => [w.id, w]));
  log(`→ ${allWarehouses.length} warehouses loaded`);
  return warehouseMap;
}

// Load existing suppliers and categories, creating new ones if needed
async function loadSuppliers(results, log) {
  log("Loading existing suppliers...");
  const supplierIds = [
    ...new Set(
      results.map((r) => String(r.id_proveedor ?? "").trim()).filter(Boolean)
    ),
  ];
  const existingSuppliers = await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
  });
  const supplierMap = new Map(existingSuppliers.map((s) => [s.id, s]));
  log(`→ ${existingSuppliers.length} suppliers found`);

  // Crear proveedores nuevos
  const newSupplierIds = supplierIds.filter((id) => !supplierMap.has(id));
  if (newSupplierIds.length) {
    log(`→ ${newSupplierIds.length} new suppliers to create`);
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
    log(`→ ${refreshedSuppliers.length} new suppliers created`);
  }

  return { supplierMap, totalSuppliersCreated: newSupplierIds.length };
}

// Load existing categories and create new ones if needed
async function loadCategories(results, log) {
  log("Loading existing categories...");
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

  // Filter out empty category names
  const existingCategories = await prisma.category.findMany({
    where: { name: { in: categoryNames } },
  });
  const categoryMap = new Map(
    existingCategories.map((c) => [c.name.toLowerCase(), c])
  );
  log(`→ ${existingCategories.length} categories found`);

  // Create new categories if they don't exist
  const newCategoryNames = categoryNames.filter(
    (name) => !categoryMap.has(name)
  );
  if (newCategoryNames.length) {
    log(`→ ${newCategoryNames.length} new categories to create`);
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
    log(`→ ${refreshedCategories.length} new categories created`);
  }

  return { categoryMap, totalCategoriesCreated: newCategoryNames.length };
}

// Load existing products into a map for quick access
async function loadProducts(results, log) {
  log("Loading existing products...");
  const productIds = [
    ...new Set(
      results.map((r) => String(r.id_producto ?? "").trim()).filter(Boolean)
    ),
  ];
  const existingProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(existingProducts.map((p) => [p.id, p]));
  log(`→ ${existingProducts.length} products found`);
  return productMap;
}

// Load existing product warehouses into a map for quick access
async function loadProductWarehouses(results, log) {
  log("Loading existing productWarehouse relationships...");
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
  log(`→ ${existingPWs.length} productWarehouses found`);
  return pwMap;
}

// Load existing product-supplier relationships into a set for quick access
async function loadProductSuppliers(results, log) {
  log("Loading existing productSupplier relationships (CSV only)...");
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
  log(`→ ${productSupplierPairs.length} product-supplier pairs to verify`);
  const existingPS = await prisma.productSupplier.findMany({
    where: { OR: productSupplierPairs },
  });
  const psSet = new Set(
    existingPS.map((ps) => `${ps.productId}||${ps.supplierId}`)
  );
  log(`→ ${existingPS.length} existing productSupplier relationships`);
  return psSet;
}

// --- Validations ---
// Validate warehouse, supplier, and category existence
function isValidWarehouse(productId, warehouseId, warehouseMap, log) {
  if (!productId || !warehouseId || !warehouseMap.has(warehouseId)) {
    log(`  ► Invalid warehouse for product "${productId}"`);
    return false;
  }
  return true;
}

function isValidSupplier(supplierId, supplier, productId, log) {
  if (supplierId && !supplier) {
    log(`  ► Invalid supplier for product "${productId}"`);
    return false;
  }
  return true;
}

function isValidCategory(catName, category, productId, log) {
  if (catName && !category) {
    log(`  ► Invalid category for product "${productId}"`);
    return false;
  }
  return true;
}

// Build new product object from CSV row
function buildNewProduct(row, productId, category) {
  const name = String(row.nombre_producto ?? "").trim();
  const priceRaw = row.precio_unitario;
  const weightRaw = row.peso_kg;
  if (!name || priceRaw == null || weightRaw == null) {
    throw new Error(
      `Missing required fields for product "${productId}": name, price_unit or weight_kg`
    );
  }
  const unitPrice = normalizeDecimal(priceRaw);
  const weightKg = normalizeDecimal(weightRaw);
  if (isNaN(unitPrice) || isNaN(weightKg)) {
    throw new Error(
      `Invalid fields for product "${productId}": price_unit or weight_kg are not numeric`
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

// Build product warehouse update and create objects
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

// Build product warehouse create object
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

// Process a batch of records
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

// --- Main processing functions ---
// Helper for updating existing product warehouses
async function updateProductWarehouses(pwsToUpdate, prisma, log, movementsToCreate, lowStockAlerts, totalPWUpdated) {
  for (const pw of pwsToUpdate) {
    log(`  ► Updating PW id=${pw.id}`);
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
        notes: "Update by bulk load",
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
    log(`  ► Creating ${pwsToCreate.length} new PWs`);
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
        notes: "Creation by bulk load",
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

// Process batches of records, creating or updating products and their warehouses
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
    log(`  Batch ${i + 1} to ${i + batch.length}`);

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

    // Create new products
    if (newProductsData.length) {
      log(`  ► Creating ${newProductsData.length} products`);
      await prisma.product.createMany({
        data: newProductsData,
        skipDuplicates: true,
      });
      totalProductsCreated += newProductsData.length;
      newProductsData.forEach((p) => productMap.set(p.id, p));
    }

    // Update existing product warehouses
    await updateProductWarehouses(
      pwsToUpdate,
      prisma,
      log,
      movementsToCreate,
      lowStockAlerts,
      totalPWUpdated
    );

    // Create new product warehouses
    await createProductWarehouses(
      pwsToCreate,
      prisma,
      log,
      pwMap,
      movementsToCreate,
      lowStockAlerts,
      totalPWCreated
    );

    // Create new product-supplier relationships
    if (productSupplierToCreate.length) {
      log(
        `  ► Creating ${productSupplierToCreate.length} productSupplier relationships`
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

// --- Upload handler ---
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
    log("Start reading the file.");

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

    log("Processing records in batches...");
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
      log(`Creating ${movementsToCreate.length} inventory movements`);
      for (let i = 0; i < movementsToCreate.length; i += BATCH_SIZE) {
        const batchMovs = movementsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.productWarehouseMovement.createMany({ data: batchMovs });
        totalMovementsCreated += batchMovs.length;
      }
    }

    // Envío de alertas de stock bajo
    if (lowStockAlerts.length) {
      log(`→ Detected ${lowStockAlerts.length} products with low stock`);

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
        if (emailSent) log("→ Low stock alert sent to dispatchers.");
        else log("→ Failed to send low stock alert.");
      }
    }

    log("Import completed successfully.");
    logStream.end();

    res.status(201).json({
      message: "Import completed",
      summary: {
        productsCreated: totalProductsCreated,
        suppliersCreated: totalSuppliersCreated,
        categoriesCreated: totalCategoriesCreated,
        productWarehousesCreated: totalPWCreated,
        productWarehousesUpdated: totalPWUpdated,
        productSupplierRelationsCreated: totalPSCreated,
        movementsRegistered: totalMovementsCreated,
        lowStockAlerts: lowStockAlerts.length,
      },
    });
  } catch (err) {
    console.error("General error during import:", err.message);
    logStream.write(`[${new Date().toISOString()}] ERROR: ${err.message}\n`);
    logStream.end();
    res.status(400).json({
      error: "Missing or invalid required fields",
      detail: err.message,
    });
  }
};

module.exports = { uploadProductCSV };

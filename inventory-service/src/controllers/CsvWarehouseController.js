const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const axios = require("axios");
const prisma = require("../config/prisma");
const { sendManagerEmail } = require("../utils/mailer");

// Environment variables
const ROL_GERENTE_ID = process.env.ROL_GERENTE_ID;
const CONTRASENA_GENERICA = process.env.CONTRASENA_GENERICA;

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

// Helper for creating a log stream with timestamped filename
const createLogStream = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const logFileName = `warehouses-log-${date}_${time}.log`;
  return fs.createWriteStream(path.join(logDir, logFileName), { flags: "a" });
};

// Helper for normalizing strings
const normalizeString = (str) =>
  str
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim()
    .toLowerCase();

const BATCH_SIZE = 500;

// Helper for consistent logging
const createLogger = (logStream) => (msg) => {
  const timestamp = `[${new Date().toISOString()}] `;
  console.log(timestamp + msg);
  logStream.write(timestamp + msg + "\n");
};

// Helper for reading files (CSV or Excel)
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

// Helper for loading cities and creating map
async function loadCities(log) {
  log("Loading cities and states...");
  const allCities = await prisma.city.findMany({ include: { state: true } });
  const cityMap = new Map(
    allCities.map((c) => [
      `${normalizeString(c.name)}|${normalizeString(c.state?.name)}`,
      c,
    ])
  );
  log(`→ ${allCities.length} cities loaded`);
  return cityMap;
}

// Helper for processing batch of records
async function processBatch(batch, cityMap, log, token) {
  let totalWarehousesCreated = 0;
  let totalWarehousesUpdated = 0;
  let totalUsersCreated = 0;
  let errors = [];

  for (const row of batch) {
    const {
      ciudadRaw,
      departamentoRaw,
      idAlmacen,
      nombreAlmacen,
      gerenteRaw,
      emailRaw,
      telefonoRaw,
      direccionRaw,
      codigoPostalRaw,
      latitudRaw,
      longitudRaw,
      capacidadM2Raw,
      estadoRaw,
    } = extractRowFields(row);

    const ciudadNombre = normalizeString(String(ciudadRaw));
    const departamentoNombre = normalizeString(String(departamentoRaw));

    if (!ciudadNombre || !departamentoNombre) {
      handleInvalidCityDept(errors, log, idAlmacen, nombreAlmacen, ciudadRaw);
      continue;
    }

    const ciudadEncontrada = cityMap.get(
      `${ciudadNombre}|${departamentoNombre}`
    );
    if (!ciudadEncontrada) {
      handleCityNotFound(
        errors,
        log,
        idAlmacen,
        nombreAlmacen,
        ciudadRaw,
        departamentoRaw
      );
      continue;
    }

    const { userId, userCreated, userError } = await tryGetOrCreateUser({
      gerenteRaw,
      emailRaw,
      telefonoRaw,
      errors,
      log,
      idAlmacen,
      nombreAlmacen,
      token
    });

    if (userError) continue;
    if (userCreated) totalUsersCreated++;

    const warehouseResult = await tryCreateOrUpdateWarehouse({
      idAlmacen,
      nombreAlmacen,
      direccionRaw,
      codigoPostalRaw,
      latitudRaw,
      longitudRaw,
      capacidadM2Raw,
      estadoRaw,
      ciudadEncontrada,
      userId,
      log,
      errors,
    });

    if (warehouseResult === "updated") totalWarehousesUpdated++;
    if (warehouseResult === "created") totalWarehousesCreated++;
  }

  return {
    totalWarehousesCreated,
    totalWarehousesUpdated,
    totalUsersCreated,
    errors,
  };
}

// Helper to handle user creation logic and errors
async function tryGetOrCreateUser({
  gerenteRaw,
  emailRaw,
  telefonoRaw,
  errors,
  log,
  idAlmacen,
  nombreAlmacen,
  token
}) {
  const { name, lastName } = extractManagerNames(gerenteRaw);

  const payloadUser = {
    email: String(emailRaw).trim(),
    password: CONTRASENA_GENERICA,
    name,
    lastName,
    phone: String(telefonoRaw),
    roleId: ROL_GERENTE_ID,
  };

  let userId = null;
  let userCreated = false;
  let userError = false;
  try {
    userId = await GetOrCreateUser(payloadUser, log, token);
    if (!userId) {
      handleUserError(errors, log, idAlmacen, nombreAlmacen, payloadUser.email);
      userError = true;
    } else {
      userCreated = true;
    }
  } catch (err) {
    handleUnexpectedUserError(errors, log, idAlmacen, nombreAlmacen, payloadUser.email, err);
    userError = true;
  }
  return { userId, userCreated, userError };
}

// Helper to get or create manager user
async function GetOrCreateUser(payloadUser, log, token) {
  try {
    const existingUserResponse = await axios.get(
      `http://auth-service:4001/users/email/${payloadUser.email}`,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    if (existingUserResponse.data.id) {
      log(
        `Manager found: ${payloadUser.email}. It will be assigned to its respective warehouse.`
      );
      return existingUserResponse.data.id;
    }
  } catch {
    log(`Manager not found, trying to create: ${payloadUser.email}`);
  }

  try {
    const userId = await tryCreateUser(payloadUser, log, token);
    if (userId) {
      // Send email to manager
      const subject = "Welcome to our platform";
      const message = `Welcome to our platform! Your account has been created successfully.`;

      await sendManagerEmail(
        payloadUser.email,
        subject,
        message,
        payloadUser.password
      );
      log(`Welcome email sent to ${payloadUser.email}`);
      return userId;
    }
  } catch (err) {
    log(`Error creating manager: ${err.message}`);
    throw err;
  }

  log(`Could not create manager with base email: ${payloadUser.email}`);
  return null;
}

// Helper to create user in auth service
async function tryCreateUser(payloadUser, log, token) {
  try {
    const response = await axios.post(
      "http://auth-service:4001/users/",
      payloadUser,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    log(`► Manager created: ${response.data.user?.id} - ${payloadUser.email}`);
    return response.data.user?.id;
  } catch (err) {
    if (
      err.response?.data?.error === "Email already in use." ||
      err.response?.status === 409
    ) {
      return null;
    }
    log(`Error creating user: ${err.message}`);
    throw err;
  }
}


// Helper to handle warehouse creation/update logic and errors
async function tryCreateOrUpdateWarehouse({
  idAlmacen,
  nombreAlmacen,
  direccionRaw,
  codigoPostalRaw,
  latitudRaw,
  longitudRaw,
  capacidadM2Raw,
  estadoRaw,
  ciudadEncontrada,
  userId,
  log,
  errors,
}) {
  try {
    return await createOrUpdateWarehouse({
      idAlmacen,
      nombreAlmacen,
      direccionRaw,
      codigoPostalRaw,
      latitudRaw,
      longitudRaw,
      capacidadM2Raw,
      estadoRaw,
      ciudadEncontrada,
      userId,
      log,
    });
  } catch (err) {
    handleWarehouseError(errors, log, idAlmacen, nombreAlmacen, err);
    return null;
  }
}

// Helper to extract fields from row
function extractRowFields(row) {
  return {
    ciudadRaw: row.ciudad ?? "",
    departamentoRaw: row.departamento ?? "",
    idAlmacen: String(
      row.id_almacen ?? `ID_DESCONOCIDO_${Math.random().toString(36).slice(2)}`
    ).trim(),
    nombreAlmacen: String(row.nombre_almacen ?? "NombreDesconocido").trim(),
    gerenteRaw: row.gerente ?? "",
    emailRaw: row.email ?? "",
    telefonoRaw: row.telefono ?? "",
    direccionRaw: row.direccion ?? "",
    codigoPostalRaw: row.codigo_postal ?? "00000",
    latitudRaw: row.latitud ?? null,
    longitudRaw: row.longitud ?? null,
    capacidadM2Raw: row.capacidad_m2 ?? null,
    estadoRaw: row.estado ?? "activo",
  };
}

// Helper to extract manager names
function extractManagerNames(gerenteRaw) {
  const nombres = String(gerenteRaw).trim().split(" ");
  return {
    name: nombres[0] || "SinNombre",
    lastName: nombres.slice(1).join(" ") || "Gerente",
  };
}

// Helper to handle invalid city/department
function handleInvalidCityDept(errors, log, idAlmacen, nombreAlmacen, ciudadRaw) {
  const msg = `Error warehouse "${idAlmacen}" - "${nombreAlmacen}": Invalid city or department`;
  log(msg);
  errors.push({ ciudad: ciudadRaw, mensaje: msg });
}

// Helper to handle city not found
function handleCityNotFound(errors, log, idAlmacen, nombreAlmacen, ciudadRaw, departamentoRaw) {
  const msg = `Error warehouse "${idAlmacen}" - "${nombreAlmacen}": City "${ciudadRaw}" with department "${departamentoRaw}" does not exist in the database`;
  log(msg);
  errors.push({
    ciudad: ciudadRaw,
    departamento: departamentoRaw,
    mensaje: msg,
  });
}

// Helper to handle user creation error
function handleUserError(errors, log, idAlmacen, nombreAlmacen, email) {
  const msg = `Could not create or assign manager user for warehouse "${idAlmacen}" - "${nombreAlmacen}" based on email: ${email}`;
  log(msg);
  errors.push({ email, mensaje: msg });
}

// Helper to handle unexpected user error
function handleUnexpectedUserError(errors, log, idAlmacen, nombreAlmacen, email, err) {
  const msg = `Unexpected error creating manager user for warehouse "${idAlmacen}" - "${nombreAlmacen}": ${err.message}`;
  log(msg);
  errors.push({ email, mensaje: msg });
}

// Helper to create or update warehouse
async function createOrUpdateWarehouse({
  idAlmacen,
  nombreAlmacen,
  direccionRaw,
  codigoPostalRaw,
  latitudRaw,
  longitudRaw,
  capacidadM2Raw,
  estadoRaw,
  ciudadEncontrada,
  userId,
  log,
}) {
  const existingWarehouse = await prisma.warehouse.findUnique({
    where: { id: idAlmacen },
  });

  const dataToSave = {
    name: nombreAlmacen,
    address: String(direccionRaw).trim() || "SinDireccion",
    postalCode: String(codigoPostalRaw),
    latitude: latitudRaw !== null ? parseFloat(latitudRaw) : null,
    longitude: longitudRaw !== null ? parseFloat(longitudRaw) : null,
    capacityM2: capacidadM2Raw !== null ? parseFloat(capacidadM2Raw) : null,
    status: String(estadoRaw).trim() || "activo",
    cityId: ciudadEncontrada.id,
    managerId: userId,
  };

  if (existingWarehouse) {
    await prisma.warehouse.update({
      where: { id: idAlmacen },
      data: dataToSave,
    });
    log(`→ Warehouse updated: "${idAlmacen}" - "${nombreAlmacen}"`);
    return "updated";
  } else {
    await prisma.warehouse.create({
      data: { id: idAlmacen, ...dataToSave },
    });
    log(`→ Warehouse created: "${idAlmacen}" - "${nombreAlmacen}"`);
    return "created";
  }
}

// Helper to handle warehouse error
function handleWarehouseError(errors, log, idAlmacen, nombreAlmacen, err) {
  const msg = `Error creating or updating warehouse "${idAlmacen}" - "${nombreAlmacen}": ${err.message}`;
  log(msg);
  errors.push({ id_almacen: idAlmacen, mensaje: msg });
}

// Main function to upload warehouses with managers
const uploadWarehousesWithManagers = async (req, res) => {
  const filePath = req.file.path;
  const logStream = createLogStream();
  const log = createLogger(logStream);
  const token = req.headers.authorization; // Aquí obtienes el token

  try {
    log("Inicio de lectura del archivo.");

    const results = await readFile(filePath, log);
    const cityMap = await loadCities(log);

    let totalWarehousesCreated = 0;
    let totalWarehousesUpdated = 0;
    let totalUsersCreated = 0;
    let errors = [];

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      log(`Processing batch of records ${i + 1} to ${i + batch.length}`);

      // Aquí debes pasar el token a processBatch y a funciones internas que usan axios
      const batchResult = await processBatch(batch, cityMap, log, token);

      totalWarehousesCreated += batchResult.totalWarehousesCreated;
      totalWarehousesUpdated += batchResult.totalWarehousesUpdated;
      totalUsersCreated += batchResult.totalUsersCreated;
      errors = errors.concat(batchResult.errors);
    }

    log("Import completed successfully.");
    logStream.end();

    res.status(201).json({
      message: "Import completed",
      summary: {
        warehousesCreated: totalWarehousesCreated,
        warehousesUpdated: totalWarehousesUpdated,
        managerUsersCreated: totalUsersCreated,
        errors: errors.length,
        errorDetails: errors,
      },
    });
  } catch (error) {
    const msg = `General error importing warehouses: ${error.message}`;
    fs.appendFileSync(path.join(logDir, "error.log"), msg + "\n", "utf8");
    res
      .status(500)
      .json({ error: "Warehouse import failed", details: msg });
  }
};

module.exports = { uploadWarehousesWithManagers };

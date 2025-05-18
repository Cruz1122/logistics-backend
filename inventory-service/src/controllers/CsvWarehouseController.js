const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const axios = require("axios");
const prisma = require("../config/prisma");

const ROL_GERENTE_ID = process.env.ROL_GERENTE_ID;
const CONTRASENA_GENERICA = process.env.CONTRASENA_GENERICA;

const logDir = path.join(__dirname, "../../logs");
const logFile = path.join(logDir, "warehouses-import.log");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const createLogStream = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const logFileName = `warehouses-log-${date}_${time}.log`;
  return fs.createWriteStream(path.join(logDir, logFileName), { flags: "a" });
};

const normalizeString = (str) =>
  str
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim()
    .toLowerCase();

const BATCH_SIZE = 500;

async function tryCreateUser(payloadUser, appendLog) {
  try {
    const response = await axios.post(
      "http://auth-service:4001/users/",
      payloadUser,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
        },
      }
    );
    return response.data.user?.id;
  } catch (err) {
    if (
      err.response?.data?.error === "Email already in use." ||
      err.response?.status === 409
    ) {
      // Email duplicado
      return null;
    }
    appendLog(
      `[${new Date().toISOString()}] Error creando usuario: ${err.message}`
    );
    throw err;
  }
}

async function getOrCreateUser(payloadUser, appendLog) {
  try {
    const existingUserResponse = await axios.get(
      `http://auth-service:4001/users/email/${payloadUser.email}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
        },
      }
    );
    if (existingUserResponse.data.user?.id) {
      return existingUserResponse.data.user.id;
    }
  } catch {
    // No existe, continuar a crear
  }

  let baseEmail = payloadUser.email.split("@")[0];
  let domain = payloadUser.email.split("@")[1] || "example.com";

  for (let i = 0; i < 10; i++) {
    let tryEmail = i === 0 ? payloadUser.email : `${baseEmail}${i}@${domain}`;
    let tryPayload = { ...payloadUser, email: tryEmail };
    let userId = await tryCreateUser(tryPayload, appendLog);
    if (userId) {
      if (i > 0) {
        appendLog(
          `[${new Date().toISOString()}] Email duplicado, se asignó correo alternativo: ${tryEmail}`
        );
      }
      return userId;
    }
  }

  appendLog(
    `[${new Date().toISOString()}] No se pudo crear usuario con email base: ${
      payloadUser.email
    }`
  );
  return null;
}

const uploadWarehousesWithManagers = async (req, res) => {
  const filePath = req.file.path;
  const results = [];
  const logStream = createLogStream();

  const log = (msg) => {
    const timestamp = `[${new Date().toISOString()}] `;
    console.log(timestamp + msg);
    logStream.write(timestamp + msg + "\n");
  };
  const appendLog = (msg) => {
    console.log(msg);
    logStream.write(msg + "\n");
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

    log("Cargando ciudades y estados...");
    const allCities = await prisma.city.findMany({ include: { state: true } });
    const cityMap = new Map(
      allCities.map((c) => [
        `${normalizeString(c.name)}|${normalizeString(c.state?.name)}`,
        c,
      ])
    );
    log(`  → ${allCities.length} ciudades cargadas`);

    let totalWarehousesCreated = 0;
    let totalWarehousesUpdated = 0;
    let totalUsersCreated = 0;
    let errors = [];

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      log(`Procesando batch de registros ${i + 1} a ${i + batch.length}`);

      // Procesar cada fila del batch secuencialmente para evitar sobrecarga API
      for (const row of batch) {
        const ciudadNombre = normalizeString(row.ciudad);
        const departamentoNombre = normalizeString(row.departamento);
        const idAlmacen = row.id_almacen?.trim() || `ID_DESCONOCIDO_${i}`;
        const nombreAlmacen = row.nombre_almacen?.trim() || "NombreDesconocido";

        if (!ciudadNombre || !departamentoNombre) {
          const msg = `Error almacén "${idAlmacen}" - "${nombreAlmacen}": Ciudad o departamento inválidos`;
          appendLog(msg);
          errors.push({ ciudad: row.ciudad, mensaje: msg });
          continue;
        }

        const ciudadEncontrada = cityMap.get(
          `${ciudadNombre}|${departamentoNombre}`
        );
        if (!ciudadEncontrada) {
          const msg = `Error almacén "${idAlmacen}" - "${nombreAlmacen}": Ciudad "${row.ciudad}" con departamento "${row.departamento}" no existe en la base de datos`;
          appendLog(msg);
          errors.push({
            ciudad: row.ciudad,
            departamento: row.departamento,
            mensaje: msg,
          });
          continue;
        }

        const nombres = row.gerente?.trim().split(" ") || [];
        const name = nombres[0] || "SinNombre";
        const lastName = nombres.slice(1).join(" ") || "Gerente";

        const payloadUser = {
          email: row.email.trim(),
          password: CONTRASENA_GENERICA,
          name,
          lastName,
          phone: String(row.telefono),
          roleId: ROL_GERENTE_ID,
        };

        let userId = null;
        try {
          userId = await getOrCreateUser(payloadUser, appendLog);
          if (!userId) {
            const msg = `No se pudo crear o asignar usuario gerente para almacén "${idAlmacen}" - "${nombreAlmacen}" con base en email: ${payloadUser.email}`;
            appendLog(msg);
            errors.push({ email: payloadUser.email, mensaje: msg });
            continue;
          } else {
            totalUsersCreated++;
          }
        } catch (err) {
          const msg = `Error inesperado creando usuario gerente para almacén "${idAlmacen}" - "${nombreAlmacen}": ${err.message}`;
          appendLog(msg);
          errors.push({ email: payloadUser.email, mensaje: msg });
          continue;
        }

        try {
          const existingWarehouse = await prisma.warehouse.findUnique({
            where: { id: idAlmacen },
          });

          const dataToSave = {
            name: nombreAlmacen,
            address: row.direccion?.trim() || "SinDireccion",
            postalCode: String(row.codigo_postal || "00000"),
            latitude: parseFloat(row.latitud),
            longitude: parseFloat(row.longitud),
            capacityM2: parseFloat(row.capacidad_m2),
            status: row.estado?.trim() || "activo",
            cityId: ciudadEncontrada.id,
            managerId: userId,
          };

          if (existingWarehouse) {
            await prisma.warehouse.update({
              where: { id: idAlmacen },
              data: dataToSave,
            });
            totalWarehousesUpdated++;
          } else {
            await prisma.warehouse.create({
              data: { id: idAlmacen, ...dataToSave },
            });
            totalWarehousesCreated++;
          }
        } catch (err) {
          const msg = `Error creando o actualizando almacén "${idAlmacen}" - "${nombreAlmacen}": ${err.message}`;
          appendLog(msg);
          errors.push({ id_almacen: idAlmacen, mensaje: msg });
        }
      }
    }

    log("Importación completada exitosamente.");
    logStream.end();

    res.status(201).json({
      message: "Importación completada",
      resumen: {
        almacenesCreados: totalWarehousesCreated,
        almacenesActualizados: totalWarehousesUpdated,
        usuariosGerentesCreados: totalUsersCreated,
        errores: errors.length,
        detallesErrores: errors,
      },
    });
  } catch (error) {
    const msg = `Error general importando almacenes: ${error.message}`;
    fs.appendFileSync(logFile, msg + "\n", "utf8");
    res
      .status(500)
      .json({ error: "Fallo importación almacenes", detalles: msg });
  }
};

module.exports = { uploadWarehousesWithManagers };

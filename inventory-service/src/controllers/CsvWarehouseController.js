const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const axios = require("axios");
const prisma = require("../config/prisma");

const ROL_GERENTE_ID = process.env.ROL_GERENTE_ID;
const CONTRASENA_GENERICA = process.env.CONTRASENA_GENERICA;

const logDir = path.join(__dirname, "../../logs");
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

async function tryCreateUser(payloadUser, log) {
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
    log(`► Gerente creado: ${response.data.user?.id} - ${payloadUser.email}`);
    return response.data.user?.id;
  } catch (err) {
    if (
      err.response?.data?.error === "Email already in use." ||
      err.response?.status === 409
    ) {
      return null;
    }
    log(`Error creando usuario: ${err.message}`);
    throw err;
  }
}

async function getOrCreateUser(payloadUser, log) {
  try {
    const existingUserResponse = await axios.get(
      `http://auth-service:4001/users/email/${payloadUser.email}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
        },
      }
    );
    if (existingUserResponse.data.id) {
      log(
        `→ Gerente encontrado: ${payloadUser.email}. Se asignará a su respectivo almacén.`
      );
      return existingUserResponse.data.id;
    }
  } catch {
    log(`Gerente no encontrado, intentando crear: ${payloadUser.email}`);
  }

  try {
    const userId = await tryCreateUser(payloadUser, log);
    if (userId) {
      return userId;
    }
  } catch (err) {
    log(`Error creando gerente: ${err.message}`);
    throw err;
  }

  log(`No se pudo crear gerente con email base: ${payloadUser.email}`);
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

  try {
    log("Inicio de lectura del archivo.");

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
      log(
        `→ Archivo Excel leído completamente. Filas leídas: ${results.length}`
      );
    } else {
      throw new Error(
        "Formato de archivo no soportado. Solo CSV y Excel (.xls, .xlsx)"
      );
    }

    log("Cargando ciudades y estados...");
    const allCities = await prisma.city.findMany({ include: { state: true } });
    const cityMap = new Map(
      allCities.map((c) => [
        `${normalizeString(c.name)}|${normalizeString(c.state?.name)}`,
        c,
      ])
    );
    log(`→ ${allCities.length} ciudades cargadas`);

    let totalWarehousesCreated = 0;
    let totalWarehousesUpdated = 0;
    let totalUsersCreated = 0;
    let errors = [];

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      log(`Procesando batch de registros ${i + 1} a ${i + batch.length}`);

      for (const row of batch) {
        const ciudadRaw = row.ciudad ?? "";
        const departamentoRaw = row.departamento ?? "";
        const idAlmacenRaw = row.id_almacen ?? `ID_DESCONOCIDO_${i}`;
        const nombreAlmacenRaw = row.nombre_almacen ?? "NombreDesconocido";
        const gerenteRaw = row.gerente ?? "";
        const emailRaw = row.email ?? "";
        const telefonoRaw = row.telefono ?? "";
        const direccionRaw = row.direccion ?? "";
        const codigoPostalRaw = row.codigo_postal ?? "00000";
        const latitudRaw = row.latitud ?? null;
        const longitudRaw = row.longitud ?? null;
        const capacidadM2Raw = row.capacidad_m2 ?? null;
        const estadoRaw = row.estado ?? "activo";

        const ciudadNombre = normalizeString(String(ciudadRaw));
        const departamentoNombre = normalizeString(String(departamentoRaw));
        const idAlmacen = String(idAlmacenRaw).trim();
        const nombreAlmacen = String(nombreAlmacenRaw).trim();

        if (!ciudadNombre || !departamentoNombre) {
          const msg = `Error almacén "${idAlmacen}" - "${nombreAlmacen}": Ciudad o departamento inválidos`;
          log(msg);
          errors.push({ ciudad: ciudadRaw, mensaje: msg });
          continue;
        }

        const ciudadEncontrada = cityMap.get(
          `${ciudadNombre}|${departamentoNombre}`
        );
        if (!ciudadEncontrada) {
          const msg = `Error almacén "${idAlmacen}" - "${nombreAlmacen}": Ciudad "${ciudadRaw}" con departamento "${departamentoRaw}" no existe en la base de datos`;
          log(msg);
          errors.push({
            ciudad: ciudadRaw,
            departamento: departamentoRaw,
            mensaje: msg,
          });
          continue;
        }

        const nombres = String(gerenteRaw).trim().split(" ");
        const name = nombres[0] || "SinNombre";
        const lastName = nombres.slice(1).join(" ") || "Gerente";

        const payloadUser = {
          email: String(emailRaw).trim(),
          password: CONTRASENA_GENERICA,
          name,
          lastName,
          phone: String(telefonoRaw),
          roleId: ROL_GERENTE_ID,
        };

        let userId = null;
        try {
          userId = await getOrCreateUser(payloadUser, log);
          if (!userId) {
            const msg = `No se pudo crear o asignar usuario gerente para almacén "${idAlmacen}" - "${nombreAlmacen}" con base en email: ${payloadUser.email}`;
            log(msg);
            errors.push({ email: payloadUser.email, mensaje: msg });
            continue;
          } else {
            totalUsersCreated++;
          }
        } catch (err) {
          const msg = `Error inesperado creando usuario gerente para almacén "${idAlmacen}" - "${nombreAlmacen}": ${err.message}`;
          log(msg);
          errors.push({ email: payloadUser.email, mensaje: msg });
          continue;
        }

        try {
          const existingWarehouse = await prisma.warehouse.findUnique({
            where: { id: idAlmacen },
          });

          const dataToSave = {
            name: nombreAlmacen,
            address: String(direccionRaw).trim() || "SinDireccion",
            postalCode: String(codigoPostalRaw),
            latitude: latitudRaw !== null ? parseFloat(latitudRaw) : null,
            longitude: longitudRaw !== null ? parseFloat(longitudRaw) : null,
            capacityM2:
              capacidadM2Raw !== null ? parseFloat(capacidadM2Raw) : null,
            status: String(estadoRaw).trim() || "activo",
            cityId: ciudadEncontrada.id,
            managerId: userId,
          };

          if (existingWarehouse) {
            await prisma.warehouse.update({
              where: { id: idAlmacen },
              data: dataToSave,
            });
            log(`→ Almacén actualizado: "${idAlmacen}" - "${nombreAlmacen}"`);
            totalWarehousesUpdated++;
          } else {
            await prisma.warehouse.create({
              data: { id: idAlmacen, ...dataToSave },
            });
            log(`→ Almacén creado: "${idAlmacen}" - "${nombreAlmacen}"`);
            totalWarehousesCreated++;
          }
        } catch (err) {
          const msg = `Error creando o actualizando almacén "${idAlmacen}" - "${nombreAlmacen}": ${err.message}`;
          log(msg);
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
    fs.appendFileSync(path.join(logDir, "error.log"), msg + "\n", "utf8");
    res
      .status(500)
      .json({ error: "Fallo importación almacenes", detalles: msg });
  }
};

module.exports = { uploadWarehousesWithManagers };

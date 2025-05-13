const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const axios = require("axios");
const prisma = require("../config/prisma");

const ROL_GERENTE_ID = process.env.ROL_GERENTE_ID;
const CONTRASENA_GENERICA = process.env.CONTRASENA_GENERICA;

// --- Configuración de log ---
const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const fecha = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
const logFile = path.join(logDir, `warehouses-errors-${fecha}.log`);
const appendLog = (msg) => fs.appendFileSync(logFile, `${msg}\n`, "utf8");

// --- Normalizador ---
const normalizeString = (str) =>
  str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, "").trim().toLowerCase();

// --- Controlador principal ---
const uploadWarehousesWithManagers = async (req, res) => {
  const filePath = req.file.path;
  const results = [];
  const errores = [];

  fs.createReadStream(filePath, { encoding: "latin1" })
    .pipe(csv({ separator: ";" }))
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      try {
        const allCities = await prisma.city.findMany();

        for (const row of results) {
          const ciudadNombre = normalizeString(row.ciudad);
          const departamentoNombre = normalizeString(row.departamento);
          const idAlmacen = row.id_almacen?.trim() || "ID_DESCONOCIDO";
          const nombreAlmacen = row.nombre_almacen?.trim() || "NombreDesconocido";

          if (!ciudadNombre || !departamentoNombre) {
            const msg = `Error al crear almacén "${idAlmacen}" - "${nombreAlmacen}": Nombre de ciudad o departamento inválido`;
            appendLog(msg);
            errores.push({ ciudad: row.ciudad, mensaje: msg });
            continue;
          }

          let ciudadEncontrada = allCities.find(
            (c) => normalizeString(c.name) === ciudadNombre
          );

          if (!ciudadEncontrada) {
            try {
              const nuevaCiudad = await prisma.city.create({
                data: {
                  name: row.ciudad.trim(),
                  state: {
                    connectOrCreate: {
                      where: { name: row.departamento.trim() },
                      create: { name: row.departamento.trim() },
                    },
                  },
                },
              });
              ciudadEncontrada = nuevaCiudad;
            } catch (err) {
              const msg = `Error al crear almacén "${idAlmacen}" - "${nombreAlmacen}": La ciudad no existe en la base de datos`;
              appendLog(msg);
              errores.push({ ciudad: row.ciudad, mensaje: msg });
              continue;
            }
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

          let userId;
          try {
            const userResponse = await axios.post("http://auth-service:4001/users/", payloadUser, {
              headers: {
                Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
              },
            });

            userId = userResponse.data.user?.id;
            if (!userId) {
              const msg = `Error al crear almacén "${idAlmacen}" - "${nombreAlmacen}": El servicio de autenticación no devolvió un ID de usuario`;
              appendLog(msg);
              errores.push({ email: payloadUser.email, mensaje: msg });
              continue;
            }
          } catch (err) {
            const status = err.response?.status;
            const yaExiste = status === 409 || err.response?.data?.message?.includes("ya existe");

            const msg = yaExiste
              ? `Error al crear almacén "${idAlmacen}" - "${nombreAlmacen}": El usuario ya existe`
              : `Error al crear almacén "${idAlmacen}" - "${nombreAlmacen}": No se pudo crear el usuario`;

            appendLog(msg);
            errores.push({ email: payloadUser.email, mensaje: msg });
            continue;
          }

          try {
            await prisma.warehouse.create({
              data: {
                id: idAlmacen,
                name: nombreAlmacen,
                address: row.direccion?.trim() || "SinDireccion",
                postalCode: String(row.codigo_postal || "00000"),
                latitude: parseFloat(row.latitud),
                longitude: parseFloat(row.longitud),
                capacityM2: parseFloat(row.capacidad_m2),
                status: row.estado?.trim() || "activo",
                cityId: ciudadEncontrada.id,
                managerId: userId,
              },
            });
          } catch (err) {
            const msg = `Error al crear almacén "${idAlmacen}" - "${nombreAlmacen}": ${err.message}`;
            appendLog(msg);
            errores.push({ id_almacen: idAlmacen, mensaje: msg });
          }
        }

        res.status(201).json({ message: "Importación completada", errores });
      } catch (error) {
        const msg = `Error general al importar almacenes: ${error.message}`;
        appendLog(msg);
        res.status(500).json({ error: "Falló la importación de almacenes con gerentes" });
      }
    });
};

module.exports = { uploadWarehousesWithManagers };

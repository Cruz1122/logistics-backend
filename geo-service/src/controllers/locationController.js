const Location = require("../models/Location");
const axios = require("axios");
const GOOGLE_GEOCODE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
let pLimit;
(async () => {
  pLimit = (await import("p-limit")).default;
})();

// POST /locations – guarda nueva posición
async function createLocation(req, res) {
  try {
    const loc = new Location(req.body);
    await loc.save();
    res.status(201).json(loc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /locations – lista o filtra por repartidor
async function getLocations(req, res) {
  const { deliveryPersonId } = req.query;

  if (!deliveryPersonId) {
    return res.status(400).json({ error: "deliveryPersonId es requerido" });
  }

  const filter = deliveryPersonId ? { deliveryPersonId } : {};
  const list = await Location.find(filter).limit(100);

  if (!list || list.length === 0) {
    return res.status(404).json({ error: "No se encontraron ubicaciones." });
  }
  res.json(list);
}

// GET /locations/near – ubicaciones cercanas a un punto
async function getLocationsNear(req, res) {
  const { lng, lat, maxDistance = 500 } = req.query;

  if (!lng || !lat) {
    return res.status(400).json({ error: "lng y lat son requeridos." });
  }

  const points = await Location.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: parseInt(maxDistance),
      },
    },
  }).limit(50);

  if (!points || points.length === 0) {
    return res
      .status(404)
      .json({ error: "No se encontraron ubicaciones cercanas." });
  }
  res.json(points);
}

async function updateLocation(req, res) {
  try {
    const { deliveryPersonId, location } = req.body;
    if (!deliveryPersonId || !location?.coordinates) {
      return res.status(400).json({ error: "Faltan datos requeridos." });
    }

    const loc = new Location({
      deliveryPersonId,
      location,
      timestamp: new Date(),
    });

    await loc.save();

    // Obtén el objeto io desde el request
    const io = req.app.get("io");

    // Emite evento a todos los clientes suscritos a este deliveryPersonId
    io.to(deliveryPersonId).emit("locationUpdate", {
      deliveryPersonId,
      location,
      timestamp: loc.timestamp,
    });

    res.status(200).json({ message: "Ubicación actualizada." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
  

async function getLatestLocation(req, res) {
  try {
    const { deliveryPersonId } = req.query;
    if (!deliveryPersonId) {
      return res.status(400).json({ error: "deliveryPersonId es requerido" });
    }

    // Obtiene la última ubicación (orden descendente por timestamp)
    const latestLocation = await Location.findOne({ deliveryPersonId })
      .sort({ timestamp: -1 })
      .exec();

    if (!latestLocation) {
      return res
        .status(404)
        .json({ error: "No se encontró ubicación para ese repartidor" });
    }

    res.json(latestLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function trackCode(req, res) {
  try {
    const { trackingCode } = req.query;
    if (!trackingCode) {
      return res.status(400).json({ error: "trackingCode es requerido" });
    }

    // 1. Consulta orders-service para obtener deliveryPersonId
    const ordersRes = await axios.get(
      `${process.env.ORDERS_URL}/orders/tracking/${trackingCode}`
    );
    const order = ordersRes.data;

    if (!order)
      return res.status(404).json({ error: "Código de tracking no válido" });

    const deliveryPersonId = order.deliveryId;
    res.json(deliveryPersonId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Función que obtiene los pedidos y geocodifica sus direcciones
async function getOrdersWithCoords(req, res) {
  try {
    console.log("Iniciando petición a orders...");
    const ordersResponse = await axios.get(
      `${process.env.ORDERS_URL}/orders/`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const orders = ordersResponse.data;
    console.log(`Pedidos obtenidos: ${orders.length}`);

    const ordersWithAddress = orders.filter((o) => o.deliveryAddress?.trim());

    console.log("Iniciando geocodificación...");
    const limit = pLimit(5);
    const geocodedOrders = await Promise.all(
      ordersWithAddress.map((order) =>
        limit(async () => {
          const geo = await geocodeAddress(order.deliveryAddress);
          if (geo) {
            return {
              orderId: order.id,
              lat: geo.lat,
              lng: geo.lng,
              formattedAddress: geo.formattedAddress,
            };
          }
          return null;
        })
      )
    );
    console.log("Geocodificación finalizada.");

    const filtered = geocodedOrders.filter((o) => o !== null);
    console.log(`Pedidos geocodificados: ${filtered.length}`);
    return res.json(filtered);
  } catch (error) {
    console.error("Error obteniendo pedidos con coords:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function geocodeAddress(address) {
  const url = "https://maps.googleapis.com/maps/api/geocode/json";
  const params = {
    address,
    key: GOOGLE_GEOCODE_API_KEY,
  };
  try {
    const response = await axios.get(url, { params });
    if (
      response.data.status === "OK" &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: response.data.results[0].formatted_address,
      };
    } else {
      console.warn(`No se pudo geocodificar: ${address}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocodificando dirección: ${address}`, error.message);
    return null;
  }
}

async function getWarehousesCoords(req, res) {
  try {
    console.log("Iniciando petición a almacenes...");
    const warehousesResponse = await axios.get(
      `${process.env.INVENTORY_URL}/warehouse`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const warehouses = warehousesResponse.data;
    console.log(`Almacenes obtenidos: ${warehouses.length}`);

    // Cada almacén tiene 'latitude' y 'longitude' como atributos separados
    const warehousesWithCoords = warehouses
      .filter((w) => w.latitude != null && w.longitude != null)
      .map((w) => ({
      warehouseId: w.id,
      lat: Number(w.latitude),
      lng: Number(w.longitude),
      }));

    console.log(`Almacenes con coords válidas: ${warehousesWithCoords.length}`);
    return res.json(warehousesWithCoords);
  } catch (error) {
    console.error("Error obteniendo almacenes con coords:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function getDeliveriesCoords(req, res) {
  try {
    console.log("Iniciando petición a deliveries...");

    // 1. Obtener todos los delivery persons
    const deliveriesResponse = await axios.get(
      `${process.env.ORDERS_URL}/delivery-persons/`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const deliveries = deliveriesResponse.data;
    console.log(`Entregas obtenidas: ${deliveries.length}`);

    // 2. Obtener todos los usuarios
    const usersResponse = await axios.get(
      `${process.env.AUTH_URL}/users/users/`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const users = usersResponse.data;

    // 3. Filtrar usuarios activos y obtener sus IDs
    const activeUserIds = new Set(
      users.filter((u) => u.isActive).map((u) => u.id)
    );

    // 4. Filtrar deliveries que estén asociados a usuarios activos
    const activeDeliveries = deliveries.filter(
      (d) => activeUserIds.has(d.idUser) // o d.user_id, según cómo se llame en tu modelo
    );

    const deliveryIds = activeDeliveries.map((d) => d.id);

    // 5. Obtener últimas ubicaciones en batch
    const latestLocationsMap = await getLatestLocationsBatch(deliveryIds);

    // 6. Construir array con datos y coords
    const deliveriesWithCoords = activeDeliveries
      .map((delivery) => {
        const latest = latestLocationsMap[delivery.id];
        if (latest?.location?.coordinates) {
          return {
            deliveryPersonId: delivery.id,
            lat: latest.location.coordinates[1],
            lng: latest.location.coordinates[0],
            name: delivery.name,
            timestamp: latest.timestamp,
          };
        }
        return null;
      })
      .filter((d) => d !== null);

    console.log(
      `Entregas con coords válidas (usuarios activos): ${deliveriesWithCoords.length}`
    );
    return res.json(deliveriesWithCoords);
  } catch (error) {
    console.error("Error obteniendo entregas con coords:", error.message);
    return res.status(500).json({ error: error.message });
  }
}


// Recibe un arreglo de deliveryPersonId y devuelve la última ubicación de cada uno
async function getLatestLocationsBatch(deliveryPersonIds) {
  // Query para obtener la última ubicación de cada deliveryPersonId
  // Usamos agregación MongoDB para agrupar y sacar la última por timestamp
  const pipeline = [
    { $match: { deliveryPersonId: { $in: deliveryPersonIds } } },
    {
      $sort: { deliveryPersonId: 1, timestamp: -1 } // ordenar para sacar primero la más reciente
    },
    {
      $group: {
        _id: "$deliveryPersonId",
        location: { $first: "$location" },
        timestamp: { $first: "$timestamp" },
      }
    }
  ];

  const results = await Location.aggregate(pipeline);
  // results será un array con objetos {_id: deliveryPersonId, location, timestamp}

  // Mapear para acceso rápido si quieres
  const locationsMap = {};
  results.forEach(({ _id, location, timestamp }) => {
    locationsMap[_id] = { location, timestamp };
  });
  return locationsMap; // { deliveryPersonId: {location, timestamp}, ... }
}

module.exports = {
  createLocation,
  getLocations,
  getLocationsNear,
  updateLocation,
  getLatestLocation,
  trackCode,
  getOrdersWithCoords,
  getDeliveriesCoords,
  getWarehousesCoords
};

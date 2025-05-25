const Location = require("../models/Location");
const axios = require("axios");

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

module.exports = {
  createLocation,
  getLocations,
  getLocationsNear,
  updateLocation,
  getLatestLocation,
  trackCode,
};

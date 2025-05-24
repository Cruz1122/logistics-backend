const Location = require("../models/Location");

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
  const filter = deliveryPersonId ? { deliveryPersonId } : {};
  const list = await Location.find(filter).limit(100);
  res.json(list);
}

// GET /locations/near – ubicaciones cercanas a un punto
async function getLocationsNear(req, res) {
  const { lng, lat, maxDistance = 500 } = req.query;
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
  res.json(points);
}

module.exports = {
  createLocation,
  getLocations,
  getLocationsNear,
};

const router = require("express").Router();
const {
  createLocation,
  getLocations,
  getLocationsNear,
} = require("../controllers/locationController");

// POST /locations – guarda nueva posición
router.post("/", createLocation);

// GET /locations – lista o filtra por repartidor
router.get("/", getLocations);

// GET /locations/near – ubicaciones cercanas a un punto
router.get("/near", getLocationsNear);

module.exports = router;

const router = require("express").Router();
const {
  createLocation,
  getLocations,
  getLocationsNear,
  updateLocation,
  getLatestLocation,
  trackCode,
  getOrdersWithCoords,
  getWarehousesCoords,
  getDeliveriesCoords,
  getGeocodedLocationHistory,
} = require("../controllers/locationController");

// POST /locations – guarda nueva posición
router.post("/", createLocation);

// POST /locations/update – actualiza la posición de un repartidor
router.post("/update", updateLocation);

// GET /locations/track – devuelve la última ubicación de un repartidor
router.get("/track", trackCode);

// GET /locations – lista o filtra por repartidor
router.get("/", getLocations);

// GET /locations/near – ubicaciones cercanas a un punto
router.get("/near", getLocationsNear);

// GET /locations/latest – obtiene la última ubicación de un repartidor
router.get("/latest", getLatestLocation);

router.get("/routes", getGeocodedLocationHistory);

// GET /orders, /warehouses, /deliveries – obtiene coordenadas de pedidos, almacenes y entregas
router.get("/orders", getOrdersWithCoords);
router.get("/warehouses", getWarehousesCoords);
router.get("/deliveries", getDeliveriesCoords);

module.exports = router;

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

// POST /locations – saves a new position
router.post("/", createLocation);

// POST /locations/update – updates a delivery person by tracking code's position
router.post("/update", updateLocation);

// GET /locations/track – returns the latest location of a delivery person by tracking code
router.get("/track", trackCode);

// GET /locations – lists or filters by delivery person by tracking code
router.get("/", getLocations);

// GET /locations/near – locations near a point
router.get("/near", getLocationsNear);

// GET /locations/latest – gets the latest location of a delivery person by tracking code
router.get("/latest", getLatestLocation);

// GET /locations/routes – gets the history of geocoded locations
router.get("/routes", getGeocodedLocationHistory);

// GET /orders, /warehouses, /deliveries – gets coordinates of orders, warehouses, and deliveries
router.get("/orders", getOrdersWithCoords);
router.get("/warehouses", getWarehousesCoords);
router.get("/deliveries", getDeliveriesCoords);

module.exports = router;

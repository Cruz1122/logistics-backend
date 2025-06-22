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


/**
 * @swagger
 * /locations:
 *   post:
 *     summary: Save a new location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryPersonId
 *               - orderId
 *               - location
 *             properties:
 *               deliveryPersonId:
 *                 type: string
 *                 example: "dp-423"
 *               orderId:
 *                 type: string
 *                 example: "order-896"
 *               location:
 *                 type: object
 *                 required:
 *                   - type
 *                   - coordinates
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "Point"
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [174.05, 44.21]
 *     responses:
 *       201:
 *         description: Location saved
 */
router.post("/", createLocation);

/**
 * @swagger
 * /locations:
 *   get:
 *     summary: Get locations by deliveryPersonId
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deliveryPersonId
 *         schema:
 *           type: string
 *         required: true
 *         description: Delivery person ID
 *     responses:
 *       200:
 *         description: List of locations
 *       400:
 *         description: deliveryPersonId is required
 *       404:
 *         description: No locations found
 */
router.get("/", getLocations);

/**
 * @swagger
 * /locations/near:
 *   get:
 *     summary: Get locations near a point
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         required: true
 *         description: Longitude
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         required: true
 *         description: Latitude
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: integer
 *         required: false
 *         description: Maximum distance in meters (default 500)
 *     responses:
 *       200:
 *         description: Nearby locations found
 *       400:
 *         description: lng and lat are required
 *       404:
 *         description: No nearby locations found
 */
router.get("/near", getLocationsNear);

/**
 * @swagger
 * /locations/update:
 *   post:
 *     summary: Update a delivery person's location and emit WebSocket event
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryPersonId
 *               - location
 *               - timestamp
 *             properties:
 *               deliveryPersonId:
 *                 type: string
 *                 example: "123456789"
 *               location:
 *                 type: object
 *                 required:
 *                   - type
 *                   - coordinates
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "Point"
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [-75.5956709, 5.0664066]
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-05-24T15:00:00.000Z"
 *     responses:
 *       200:
 *         description: Location updated
 *       400:
 *         description: Missing required data
 */
router.post("/update", updateLocation);

/**
 * @swagger
 * /locations/latest:
 *   get:
 *     summary: Get the latest location of a delivery person
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deliveryPersonId
 *         schema:
 *           type: string
 *         required: true
 *         description: Delivery person ID
 *     responses:
 *       200:
 *         description: Latest location found
 *       400:
 *         description: deliveryPersonId is required
 *       404:
 *         description: No location found for this delivery person
 */
router.get("/latest", getLatestLocation);

/**
 * @swagger
 * /locations/track:
 *   get:
 *     summary: Get delivery person ID by tracking code
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: trackingCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Tracking code
 *     responses:
 *       200:
 *         description: Delivery person ID found
 *       400:
 *         description: trackingCode is required
 *       404:
 *         description: Invalid tracking code
 */
router.get("/track", trackCode);

/**
 * @swagger
 * /locations/orders:
 *   get:
 *     summary: Get orders with geocoded coordinates
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders with coordinates
 *       500:
 *         description: Error querying orders with coords
 */
router.get("/orders", getOrdersWithCoords);

/**
 * @swagger
 * /locations/warehouses:
 *   get:
 *     summary: Get warehouses with coordinates
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouses with coordinates
 *       500:
 *         description: Error querying warehouses with coords
 */
router.get("/warehouses", getWarehousesCoords);

/**
 * @swagger
 * /locations/deliveries:
 *   get:
 *     summary: Get deliveries with coordinates
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deliveries with coordinates
 *       500:
 *         description: Error querying deliveries with coords
 */
router.get("/deliveries", getDeliveriesCoords);

/**
 * @swagger
 * /locations/geocoded-history:
 *   get:
 *     summary: Get geocoded location history for a delivery person (only Colombia)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deliveryPersonId
 *         schema:
 *           type: string
 *         required: true
 *         description: Delivery person ID
 *     responses:
 *       200:
 *         description: Geocoded location history
 *       400:
 *         description: deliveryPersonId is required
 *       404:
 *         description: No valid Colombian addresses found
 *       500:
 *         description: Error processing location history
 */
router.get("/geocoded-history", getGeocodedLocationHistory);

module.exports = router;
const Location = require("../models/Location");
const axios = require("axios");
const GOOGLE_GEOCODE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
let pLimit;

// Dynamically import p-limit to avoid issues with ESM in Node.js
(async () => {
  pLimit = (await import("p-limit")).default;
})();

// POST /locations – saves a new location
async function createLocation(req, res) {
  try {
    const loc = new Location(req.body);
    await loc.save();
    res.status(201).json(loc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /locations – lists or filters by delivery person
async function getLocations(req, res) {
  const { deliveryPersonId } = req.query;

  if (!deliveryPersonId) {
    return res.status(400).json({ error: "deliveryPersonId is required" });
  }

  const filter = { deliveryPersonId };
  const list = await Location.find(filter).sort({ timestamp: -1 }).limit(100);

  if (!list || list.length === 0) {
    return res.status(404).json({ error: "No locations found." });
  }
  res.json(list);
}

// Helper to check if should geocode based on distance and previous address
function shouldGeocodeLocation(loc, uniqueAddresses, locations) {
  if (uniqueAddresses.length === 0) return true;

  const prevTimestamp =
    uniqueAddresses[uniqueAddresses.length - 1].timestamp.getTime();
  const prevLoc = locations.find(
    (l) => l.timestamp.getTime() === prevTimestamp
  );

  if (!prevLoc) return true;

  const [lng, lat] = loc.location.coordinates;
  const [prevLng, prevLat] = prevLoc.location.coordinates;
  const distance = Math.sqrt(
    Math.pow(lat - prevLat, 2) + Math.pow(lng - prevLng, 2)
  );
  // Aprox. 0.0003 degrees ~ 30 meters
  return distance >= 0.0003;
}

// Helper to reverse geocode lat/lng and ensure that it is in Colombia
async function reverseGeocode(lat, lng) {
  try {
    const { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          latlng: `${lat},${lng}`,
          key: GOOGLE_GEOCODE_API_KEY,
        },
      }
    );

    if (
      !data ||
      data.status !== "OK" ||
      !data.results ||
      data.results.length === 0
    ) {
      return null;
    }

    // Find the first result that includes "Colombia" in address_components
    for (const result of data.results) {
      const countryComponent = result.address_components.find((ac) =>
        ac.types.includes("country")
      );
      if (countryComponent && countryComponent.long_name === "Colombia") {
        return result.formatted_address;
      }
    }

    // No results belonged to Colombia
    return null;
  } catch (err) {
    console.error("reverseGeocode error:", err.message);
    return null;
  }
}

// GET /locations/geocoded-history?deliveryPersonId=...
// Gets the geocoded location history of a delivery driver by filtering only Colombia
async function getGeocodedLocationHistory(req, res) {
  const { deliveryPersonId } = req.query;

  if (!deliveryPersonId) {
    return res.status(400).json({ error: "deliveryPersonId is required" });
  }

  try {
    // 1. Get the last 100 delivery locations (sorted ascending by timestamp)
    const locations = await Location.find({ deliveryPersonId })
      .sort({ timestamp: 1 })
      .limit(100);

    if (!locations || locations.length === 0) {
      return res.status(404).json({ error: "No locations found." });
    }

    // 2. Iterate and reverse geocode only if it changes a lot (distance >= 30m)
    const uniqueAddresses = [];
    let lastAddress = null;

    for (const loc of locations) {
      const [lng, lat] = loc.location.coordinates;

      if (shouldGeocodeLocation(loc, uniqueAddresses, locations)) {
        const address = await reverseGeocode(lat, lng);

        // If the address is null or does not belong to Colombia, we discard it
        if (address && address !== lastAddress) {
          uniqueAddresses.push({
            address,
            timestamp: loc.timestamp,
          });
          lastAddress = address;
        }
      }
    }

    if (uniqueAddresses.length === 0) {
      return res
        .status(404)
        .json({ error: "No valid Colombian addresses found." });
    }

    res.json(uniqueAddresses);
  } catch (err) {
    console.error("Error in getGeocodedLocationHistory:", err.message);
    res.status(500).json({ error: "Error processing location history." });
  }
}

// Locations near a given point
async function getLocationsNear(req, res) {
  const { lng, lat, maxDistance = 500 } = req.query;

  if (!lng || !lat) {
    return res.status(400).json({ error: "lng and lat are required." });
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
    return res.status(404).json({ error: "No nearby locations found." });
  }
  res.json(points);
}

// Updates a delivery person's location y emite el evento WebSocket
async function updateLocation(req, res) {
  try {
    const { deliveryPersonId, location } = req.body;
    if (!deliveryPersonId || !location?.coordinates) {
      console.warn(
        `[updateLocation] Missing data. deliveryPersonId: ${deliveryPersonId}, location: ${JSON.stringify(
          location
        )}`
      );
      return res.status(400).json({ error: "Missing required data." });
    }

    // Extract client IP (may vary depending on proxies)
    const clientIp =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    // Log coords and context
    console.log(`[updateLocation] DeliveryPersonId: ${deliveryPersonId}`);
    console.log(`[updateLocation] Coordinates: ${location.coordinates}`);
    console.log(`[updateLocation] Timestamp: ${new Date().toISOString()}`);
    console.log(`[updateLocation] Client IP: ${clientIp}`);
    console.log(`[updateLocation] User-Agent: ${req.headers["user-agent"]}`);

    const loc = new Location({
      deliveryPersonId,
      location,
      timestamp: new Date(),
    });

    await loc.save();

    const io = req.app.get("io");
    io.to(deliveryPersonId).emit("locationUpdate", {
      deliveryPersonId,
      location,
      timestamp: loc.timestamp,
    });

    res.status(200).json({ message: "Location updated." });
  } catch (error) {
    console.error("[updateLocation] Error:", error);
    res.status(500).json({ error: error.message });
  }
}


// Gets the latest location of a delivery person by deliveryPersonId
async function getLatestLocation(req, res) {
  try {
    const { deliveryPersonId } = req.query;
    if (!deliveryPersonId) {
      return res.status(400).json({ error: "deliveryPersonId is required" });
    }

    const latestLocation = await Location.findOne({ deliveryPersonId })
      .sort({ timestamp: -1 })
      .exec();

    if (!latestLocation) {
      return res
        .status(404)
        .json({ error: "No location found for this delivery person" });
    }

    res.json(latestLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Returns the delivery person ID by tracking code
async function trackCode(req, res) {
  try {
    const { trackingCode } = req.query;
    if (!trackingCode) {
      return res.status(400).json({ error: "trackingCode is required" });
    }
    const ordersRes = await axios.get(
      `${process.env.ORDERS_URL}/orders/tracking/${trackingCode}`
    );
    const order = ordersRes.data;
    if (!order) return res.status(404).json({ error: "Invalid tracking code" });
    const deliveryPersonId = order.deliveryId;
    res.json(deliveryPersonId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Function to get orders and geocode their addresses (filtered to Colombia)
async function getOrdersWithCoords(req, res) {
  try {
    console.log("Querying orders from orders-service...");
    const ordersResponse = await axios.get(
      `${process.env.ORDERS_URL}/orders/`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const orders = ordersResponse.data;
    console.log(`Orders obtained: ${orders.length}`);

    const ordersWithAddress = orders.filter(
      (o) => o.deliveryAddress?.trim() && o.status.toLowerCase() !== "delivered"
    );
    console.log("Starting geocoding of orders...");
    const limit = pLimit(5);

    const geocodedOrders = await Promise.all(
      ordersWithAddress.map((order) =>
        limit(async () => {
          // Force component to Colombia
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

    const filtered = geocodedOrders.filter((o) => o !== null);
    console.log(`Geocoded orders: ${filtered.length}`);
    return res.json(filtered);
  } catch (error) {
    console.error("Error querying orders with coords:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Function to geocode an address usando Google Maps Geocoding API (forzado a country:CO)
async function geocodeAddress(address) {
  const url = "https://maps.googleapis.com/maps/api/geocode/json";
  const params = {
    address,
    key: GOOGLE_GEOCODE_API_KEY,
    components: "country:CO", // Only from Colombia
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
      console.warn(`Could not geocode: ${address}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding address: ${address}`, error.message);
    return null;
  }
}

// Function to get warehouses with coordinates
async function getWarehousesCoords(req, res) {
  try {
    console.log("Starting request to warehouses...");
    const warehousesResponse = await axios.get(
      `${process.env.INVENTORY_URL}/warehouse`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const warehouses = warehousesResponse.data;
    console.log(`Warehouses obtained: ${warehouses.length}`);

    const warehousesWithCoords = warehouses
      .filter((w) => w.latitude != null && w.longitude != null)
      .map((w) => ({
        warehouseId: w.id,
        lat: Number(w.latitude),
        lng: Number(w.longitude),
      }));

    console.log(`Warehouses with valid coords: ${warehousesWithCoords.length}`);
    return res.json(warehousesWithCoords);
  } catch (error) {
    console.error("Error querying warehouses with coords:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Function to get deliveries with coordinates
async function getDeliveriesCoords(req, res) {
  try {
    console.log("Starting request to deliveries...");

    // 1. Get all deliveries from orders-service
    const deliveriesResponse = await axios.get(
      `${process.env.ORDERS_URL}/delivery-persons/`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const deliveries = deliveriesResponse.data;
    console.log(`Deliveries obtained: ${deliveries.length}`);

    // 2. Get all users from auth-service
    const usersResponse = await axios.get(
      `${process.env.AUTH_URL}/users/users/`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const users = usersResponse.data;

    // 3. Filter active users and get their IDs
    const activeUserIds = new Set(
      users.filter((u) => u.isActive).map((u) => u.id)
    );

    // 4. Filter delivery drivers associated with active users
    const activeDeliveries = deliveries.filter((d) =>
      activeUserIds.has(d.idUser)
    );
    const deliveryIds = activeDeliveries.map((d) => d.id);

    // 5. Get latest locations in batch
    const latestLocationsMap = await getLatestLocationsBatch(deliveryIds);

    // 6. Build array with data and coords
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
      `Deliveries with valid coords (active users): ${deliveriesWithCoords.length}`
    );
    return res.json(deliveriesWithCoords);
  } catch (error) {
    console.error("Error querying deliveries with coords:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Batch to get latest locations
async function getLatestLocationsBatch(deliveryPersonIds) {
  const pipeline = [
    { $match: { deliveryPersonId: { $in: deliveryPersonIds } } },
    { $sort: { deliveryPersonId: 1, timestamp: -1 } },
    {
      $group: {
        _id: "$deliveryPersonId",
        location: { $first: "$location" },
        timestamp: { $first: "$timestamp" },
      },
    },
  ];

  const results = await Location.aggregate(pipeline);
  const locationsMap = {};
  results.forEach(({ _id, location, timestamp }) => {
    locationsMap[_id] = { location, timestamp };
  });
  return locationsMap;
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
  getWarehousesCoords,
  getGeocodedLocationHistory,
};

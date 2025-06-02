const Location = require("../models/Location");
const axios = require("axios");
const GOOGLE_GEOCODE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
let pLimit;
// Dynamically import p-limit to avoid issues with ESM in Node.js
// This is done to ensure compatibility with the latest Node.js versions
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

  const filter = deliveryPersonId ? { deliveryPersonId } : {};
  const list = await Location.find(filter).limit(100);

  if (!list || list.length === 0) {
    return res.status(404).json({ error: "No locations found." });
  }
  res.json(list);
}

// Helper to check if should geocode based on distance and previous address
function shouldGeocodeLocation(loc, uniqueAddresses, locations) {
  if (uniqueAddresses.length === 0) return true;
  const prevLoc = locations.find(
    l => l.timestamp.getTime() === uniqueAddresses[uniqueAddresses.length - 1].timestamp.getTime()
  );
  if (!prevLoc) return true;
  const [lng, lat] = loc.location.coordinates;
  const [prevLng, prevLat] = prevLoc.location.coordinates;
  const distance = Math.sqrt(
    Math.pow(lat - prevLat, 2) + Math.pow(lng - prevLng, 2)
  );
  // Approximately 0.0003 degrees ~ 30 meters
  return distance >= 0.0003;
}

// Helper to geocode lat/lng
async function reverseGeocode(lat, lng) {
  const { data } = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json`,
    {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_GEOCODE_API_KEY,
      },
    }
  );
  return data?.results?.[0]?.formatted_address || "Unknown";
}

// Gets the geocoded location history of a delivery person
async function getGeocodedLocationHistory(req, res) {
  const { deliveryPersonId } = req.query;

  if (!deliveryPersonId) {
    return res.status(400).json({ error: "deliveryPersonId is required" });
  }

  try {
    // 1. Get last 100 locations for the delivery person
    const locations = await Location.find({ deliveryPersonId })
      .sort({ timestamp: 1 }) // oldest first
      .limit(100);

    if (!locations || locations.length === 0) {
      return res.status(404).json({ error: "No locations found." });
    }

    // 2. Reverse geocoding
    const uniqueAddresses = [];
    let lastAddress = null;

    // Iterate through locations and geocode if necessary
    // Use a Set to track unique addresses
    for (const loc of locations) {
      const [lng, lat] = loc.location.coordinates;

      if (shouldGeocodeLocation(loc, uniqueAddresses, locations)) {
        const address = await reverseGeocode(lat, lng);
        if (address !== lastAddress) {
          uniqueAddresses.push({
            address,
            timestamp: loc.timestamp,
          });
          lastAddress = address;
        }
      }
    }

    res.json(uniqueAddresses);
  } catch (err) {
    console.error("Error:", err.message);
    res
      .status(500)
      .json({ error: "Error processing location history." });
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
    return res
      .status(404)
      .json({ error: "No nearby locations found." });
  }
  res.json(points);
}

// Updates a delivery person's location
// This function updates the location of a delivery person and emits an event to notify clients
async function updateLocation(req, res) {
  try {
    const { deliveryPersonId, location } = req.body;
    if (!deliveryPersonId || !location?.coordinates) {
      return res.status(400).json({ error: "Missing required data." });
    }

    const loc = new Location({
      deliveryPersonId,
      location,
      timestamp: new Date(),
    });

    await loc.save();

    // Get the io object from the request
    const io = req.app.get("io");

    // Emit event to all clients subscribed to this deliveryPersonId
    io.to(deliveryPersonId).emit("locationUpdate", {
      deliveryPersonId,
      location,
      timestamp: loc.timestamp,
    });

    res.status(200).json({ message: "Location updated." });
  } catch (error) {
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

    // Get the latest location (sorted descending by timestamp)
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

    // Query orders-service to get deliveryPersonId
    const ordersRes = await axios.get(
      `${process.env.ORDERS_URL}/orders/tracking/${trackingCode}`
    );
    const order = ordersRes.data;

    if (!order)
      return res.status(404).json({ error: "Invalid tracking code" });

    const deliveryPersonId = order.deliveryId;
    res.json(deliveryPersonId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Function to get orders and geocode their addresses
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

    const ordersWithAddress = orders.filter((o) => o.deliveryAddress?.trim());

    console.log("Starting geocoding...");
    // Limit concurrency to avoid hitting API rate limits
    const limit = pLimit(5);

    // Geocode each order's delivery address in parallel
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
    console.log("Geocoding completed.");

    const filtered = geocodedOrders.filter((o) => o !== null);
    console.log(`Geocoded orders: ${filtered.length}`);
    return res.json(filtered);
  } catch (error) {
    console.error("Error querying orders with coords:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Function to geocode an address using Google Maps Geocoding API
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

    // Each warehouse has 'latitude' and 'longitude' as separate attributes
    // Filter warehouses that have valid latitude and longitude
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

    // 1. Get all delivery persons from orders-service
    const deliveriesResponse = await axios.get(
      `${process.env.ORDERS_URL}/delivery-persons/`,
      {
        headers: { Authorization: req.headers.authorization || "" },
      }
    );
    const deliveries = deliveriesResponse.data;
    console.log(`Deliveries obtained: ${deliveries.length}`);

    // 2. Get all users
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

    // 4. Filter deliveries that are associated with active users
    const activeDeliveries = deliveries.filter(
      (d) => activeUserIds.has(d.idUser) 
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


// Receives an array of deliveryPersonId and returns the latest location of each
async function getLatestLocationsBatch(deliveryPersonIds) {
  // Query to get the latest location of each deliveryPersonId
  // We use MongoDB aggregation to group and get the latest by timestamp
  const pipeline = [
    { $match: { deliveryPersonId: { $in: deliveryPersonIds } } },
    {
      $sort: { deliveryPersonId: 1, timestamp: -1 } // sort to get the most recent first
    },
    {
      $group: {
        _id: "$deliveryPersonId",
        location: { $first: "$location" },
        timestamp: { $first: "$timestamp" },
      }
    }
  ];

  const results = await Location.aggregate(pipeline); // results will be an array with objects {_id: deliveryPersonId, location, timestamp}

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
  getWarehousesCoords,
  getGeocodedLocationHistory,
};

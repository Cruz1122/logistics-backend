const prisma = require("../config/prisma");
const axios = require("axios");
const { geocode } = require("../utils/geocode");
const { sendTrackingCodeEmail } = require("../utils/mailer");

/**
 * Retrieves all orders from the database, including their delivery person and products.
 * Responds with a JSON array of orders.
 */
const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        deliveryPerson: true,
        orderProducts: true,
      },
    });
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders." });
  }
};

/**
 * Retrieves a specific order by its ID, including its delivery person and products.
 * Responds with the order object if found, or 404 if not found.
 * @param {string} req.params.id - The ID of the order to retrieve.
 */
const getOrderById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { deliveryPerson: true, orderProducts: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order." });
  }
};

/**
 * Retrieves an order by its tracking code, including its delivery person and products.
 * Responds with the order object if found, or 404 if not found.
 * @param {string} req.params.trackingCode - The tracking code of the order.
 */
const getOrderByTrackingCode = async (req, res) => {
  try {
    const { trackingCode } = req.params;
    const order = await prisma.order.findFirst({
      where: { trackingCode },
      include: { deliveryPerson: true, orderProducts: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json(order);
  } catch (error) {
    console.error("Error fetching order by tracking code:", error);
    res.status(500).json({ error: "Failed to fetch order by tracking code." });
  }
};

/**
 * Gets the geographic coordinates for a given address using the geocode utility.
 * Responds with the coordinates if found, or 404 if not found.
 * @param {string} req.params.address - The address to geocode.
 */
const getCoordsByAddress = async (req, res) => {
  const { address } = req.params;
  if (!address) {
    return res.status(400).json({ error: "Address is required." });
  }
  try {
    const coords = await geocode(address);
    if (!coords) {
      return res.status(404).json({ error: "Coordinates not found." });
    }
    res.json(coords);
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    res.status(500).json({ error: "Failed to fetch coordinates." });
  }
};

/**
 * Helper function to get user data from the auth service.
 * @param {string} userId - The user ID.
 * @param {string} token - The authorization token.
 * @returns {Promise<Object>} The user data.
 */
async function getUser(userId, token) {
  const response = await axios.get(`${process.env.AUTH_URL}/users/${userId}`, {
    headers: { Authorization: token },
  });
  return response.data;
}

/**
 * Helper function to get city and state data from the inventory service.
 * @param {string} cityId - The city ID.
 * @param {string} token - The authorization token.
 * @returns {Promise<Object>} The city and state data.
 */
async function getCityWithState(cityId, token) {
  const response = await axios.get(
    `${process.env.INVENTORY_URL}/city/${cityId}`,
    {
      headers: { Authorization: token },
    }
  );
  return response.data;
}

/**
 * Helper function to get user data and their city (with state) if available.
 * @param {string} userId - The user ID.
 * @param {string} token - The authorization token.
 * @returns {Promise<Object>} The user and city data.
 */
async function getUserWithLocation(userId, token) {
  const user = await getUser(userId, token);
  if (!user?.cityId) return { user };

  const city = await getCityWithState(user.cityId, token);
  return { user, city };
}

/**
 * Finds an available delivery person with less than 8 orders for today.
 * Optionally excludes a specific delivery person by ID.
 * @param {string} token - The authorization token.
 * @param {string|null} excludeDeliveryId - The delivery person ID to exclude.
 * @returns {Promise<Object|null>} The available delivery person or null.
 */
async function findAvailableDelivery(token, excludeDeliveryId = null) {
  const deliveryPersons = await prisma.deliveryPerson.findMany();
  for (const dp of deliveryPersons) {
    if (excludeDeliveryId && dp.id === excludeDeliveryId) continue;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const ordersToday = await prisma.order.count({
      where: {
        deliveryId: dp.id,
        estimatedDeliveryTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    if (ordersToday < 8) {
      return dp;
    }
  }
  return null;
}

/**
 * Assigns a delivery person to an order based on the customer's city and state.
 * If no match is found, assigns the first available delivery person.
 * @param {string} customerId - The customer ID.
 * @param {string} token - The authorization token.
 * @returns {Promise<Object>} The assigned delivery person.
 */
async function assignDelivery(customerId, token) {
  try {
    const customerData = await getUserWithLocation(customerId, token);

    const custCityId = customerData.city?.id;
    const custStateId = customerData.city?.state?.id;

    const deliveryPersons = await prisma.deliveryPerson.findMany();

    // Get info for each delivery person with user + city + state
    const deliveryUsers = await Promise.all(
      deliveryPersons.map(async (dp) => {
        const deliveryUserData = await getUserWithLocation(
          dp.idUser,
          token
        ).catch(() => null);
        return {
          deliveryPerson: dp,
          user: deliveryUserData?.user,
          city: deliveryUserData?.city,
        };
      })
    );

    let delivery = null;

    // Find a delivery person with the same cityId as the customer
    if (custCityId) {
      delivery = deliveryUsers.find((du) => du.city?.id === custCityId);
    }

    // If not found, find one with the same stateId
    if (!delivery && custStateId) {
      delivery = deliveryUsers.find((du) => du.city?.state?.id === custStateId);
    }

    // If still not found, find one with an assigned user
    if (!delivery) {
      delivery =
        deliveryUsers.find((du) => du.user != null) || deliveryUsers[0];
    }

    // If still not found, assign the first available delivery person
    if (!delivery) {
      throw new Error("No delivery persons available");
    }

    return delivery.deliveryPerson;
  } catch (error) {
    console.error("Error assigning delivery:", error);
    const anyDelivery = await prisma.deliveryPerson.findFirst();
    if (anyDelivery) return anyDelivery;

    throw new Error(
      "No delivery persons available and could not assign delivery automatically"
    );
  }
}

/**
 * Generates a unique tracking code for an order.
 * @returns {Promise<string>} The unique tracking code.
 */
const generateTrackingCode = async () => {
  const trackingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const existingOrder = await prisma.order.findFirst({
    where: { trackingCode },
  });

  if (existingOrder) {
    return generateTrackingCode(); // Generate another code if already exists
  }

  return trackingCode;
};

/**
 * Creates a new order with automatic delivery assignment, product validation,
 * stock decrement, and sends a tracking code email to the customer.
 * Responds with the created order object.
 */
const createOrder = async (req, res) => {
  try {
    const {
      id,
      customerId,
      status,
      deliveryAddress,
      estimatedDeliveryTime,
      products = [] // Only { productId, quantity }
    } = req.body;

    const token = req.headers.authorization;

    let delivery = await assignDelivery(customerId, token);

    // Limit to a maximum of 8 orders per day for the assigned delivery person
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const ordersToday = await prisma.order.count({
      where: {
        deliveryId: delivery.id,
        estimatedDeliveryTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // If already has 8, find another available delivery person
    if (ordersToday >= 8) {
      const otherDelivery = await findAvailableDelivery(token, delivery.id);
      if (!otherDelivery) {
        return res.status(400).json({
          error: "No delivery person available with capacity for today.",
        });
      }
      delivery = otherDelivery;
    }

    if (!delivery) {
      return res.status(404).json({ error: "No delivery person available." });
    }

    if (!customerId || !status || !deliveryAddress) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Basic validation for products
    for (const p of products) {
      if (!p.productId || typeof p.quantity !== "number") {
        return res.status(400).json({
          error: "Each product must include productId and quantity (number).",
        });
      }
    }

    // Generate unique tracking code
    const trackingCode = await generateTrackingCode();

    if (!trackingCode) {
      return res
        .status(500)
        .json({ error: "Failed to generate tracking code." });
    }

    // Get all products from inventory
    let allProducts = [];
    try {
      const response = await axios.get(
        `${process.env.INVENTORY_URL}/product`,
        {
          headers: {
            Authorization: token,
          },
        }
      );
      allProducts = response.data;
    } catch (err) {
      console.error("Error fetching all products:", err?.response?.data || err.message);
      return res.status(500).json({ error: "Failed to fetch products from inventory." });
    }

    // Create a map for quick access by productId
    const productMap = {};
    for (const prod of allProducts) {
      productMap[prod.id] = prod;
    }

    // Calculate totalAmount and prepare orderProductsData
    let totalAmount = 0;
    const orderProductsData = [];
    for (const p of products) {
      const product = productMap[p.productId];
      if (!product) {
        return res.status(404).json({
          error: `Product with ID ${p.productId} does not exist.`,
        });
      }

      const unitPrice = parseFloat(product.unitPrice);
      totalAmount += unitPrice * p.quantity;

      orderProductsData.push({
        orderId: id, // Use the order id
        productId: p.productId,
        quantity: p.quantity,
        unitPrice: unitPrice,
      });
    }

    // Create the order with the calculated totalAmount
    const order = await prisma.order.create({
      data: {
        id,
        customerId,
        deliveryId: delivery.id,
        status,
        deliveryAddress,
        estimatedDeliveryTime: estimatedDeliveryTime
          ? new Date(estimatedDeliveryTime)
          : undefined,
        totalAmount,
        trackingCode,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "The order cannot be created" });
    }

    // Insert order products
    if (orderProductsData.length > 0) {
      // Assign the real orderId if using autogenerated
      orderProductsData.forEach(op => op.orderId = order.id);
      await prisma.orderProduct.createMany({
        data: orderProductsData,
      });

      // Decrement stock in inventory-service
      for (const p of products) {
        try {
          await axios.patch(
            `${process.env.INVENTORY_URL}/product-warehouse/decrement-stock`,
            {
              productId: p.productId,
              quantity: p.quantity
            },
            { headers: { Authorization: token } }
          );
        } catch (err) {
          console.error(`Error decrementing stock for ${p.productId}:`, err?.response?.data || err.message);
          return res.status(400).json({
            error: `Could not decrement stock for product ${p.productId}`,
            details: err?.response?.data || err.message
          });
        }
      }
    }

    // Send email with the tracking code to the customer
    let customerEmail = "";
    let fullName = "";
    try {
      const userResponse = await axios.get(
        `${process.env.AUTH_URL}/users/${customerId}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );
      customerEmail = userResponse.data.email;
      fullName = `${userResponse.data.name} ${userResponse.data.lastName}`;
    } catch (err) {
      console.error("Could not get customer email:", err?.response?.data || err.message);
    }

    if (customerEmail && fullName) {
      try {
        await sendTrackingCodeEmail({
          fullName,
          subject: "Your order tracking code",
          code: trackingCode,
          email: customerEmail,
        });
      } catch (err) {
        console.error("Error sending tracking email:", err?.response?.data || err.message);
      }
    }

    res.status(201).json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: error.message || "Failed to create order." });
  }
};

/**
 * Updates an order by its ID.
 * Responds with the updated order object.
 * @param {string} req.params.id - The ID of the order to update.
 */
const updateOrder = async (req, res) => {
  const {
    deliveryId,
    status,
    deliveryAddress,
    estimatedDeliveryTime,
    totalAmount,
  } = req.body;
  try {
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        deliveryId,
        status,
        deliveryAddress,
        estimatedDeliveryTime: estimatedDeliveryTime
          ? new Date(estimatedDeliveryTime)
          : undefined,
        totalAmount,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order." });
  }
};

/**
 * Deletes an order by its ID.
 * Responds with a success message if deleted.
 * @param {string} req.params.id - The ID of the order to delete.
 */
const deleteOrder = async (req, res) => {
  try {
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ message: "Order deleted." });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order." });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderByTrackingCode,
  getCoordsByAddress,
};
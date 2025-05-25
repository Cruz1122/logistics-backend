const prisma = require("../config/prisma");
const axios = require("axios");
const { geocode } = require("../utils/geocode");

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

async function getUser(userId, token) {
  const response = await axios.get(`${process.env.AUTH_URL}/users/${userId}`, {
    headers: { Authorization: token },
  });
  return response.data;
}

async function getCityWithState(cityId, token) {
  const response = await axios.get(
    `${process.env.INVENTORY_URL}/city/${cityId}`,
    {
      headers: { Authorization: token },
    }
  );
  return response.data;
}

async function getUserWithLocation(userId, token) {
  const user = await getUser(userId, token);
  if (!user?.cityId) return { user };

  const city = await getCityWithState(user.cityId, token);
  return { user, city };
}

async function assignDelivery(customerId, token) {
  try {
    const customerData = await getUserWithLocation(customerId, token);

    const custCityId = customerData.city?.id;
    const custStateId = customerData.city?.state?.id;

    const deliveryPersons = await prisma.deliveryPerson.findMany();

    // Obtener info de cada delivery person con usuario + city + state
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

    // Buscar un delivery person que tenga el mismo cityId que el cliente
    if (custCityId) {
      delivery = deliveryUsers.find((du) => du.city?.id === custCityId);
    }

    // Si no se encuentra, buscar uno que tenga el mismo stateId
    if (!delivery && custStateId) {
      delivery = deliveryUsers.find((du) => du.city?.state?.id === custStateId);
    }

    // Si aún no se encuentra, buscar uno que tenga un usuario asignado
    if (!delivery) {
      delivery =
        deliveryUsers.find((du) => du.user != null) || deliveryUsers[0];
    }

    // Si aún no se encuentra, asignar el primer delivery person disponible
    if (!delivery) {
      throw new Error("No hay repartidores disponibles");
    }

    return delivery.deliveryPerson;
  } catch (error) {
    console.error("Error assigning delivery:", error);
    const anyDelivery = await prisma.deliveryPerson.findFirst();
    if (anyDelivery) return anyDelivery;

    throw new Error(
      "No hay repartidores disponibles y no se pudo asignar delivery automáticamente"
    );
  }
}

const generateTrackingCode = async () => {
  const trackingCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Ej: '5G7X9A'

  const existingOrder = await prisma.order.findFirst({
    where: { trackingCode },
  });

  if (existingOrder) {
    return generateTrackingCode(); // Generar otro código si ya existe
  }

  return trackingCode;
};

// Controlador para crear orden con asignación automática de delivery
const createOrder = async (req, res) => {
  try {
    const {
      id,
      customerId,
      status,
      deliveryAddress,
      estimatedDeliveryTime,
      totalAmount,
    } = req.body;
    const token = req.headers.authorization;

    const delivery = await assignDelivery(customerId, token);

    if (!delivery) {
      return res.status(404).json({ error: "No delivery person available." });
    }

    if (!customerId || !status || !deliveryAddress || !totalAmount) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Generar código de tracking único
    const trackingCode = await generateTrackingCode();

    if (!trackingCode) {
      return res
        .status(500)
        .json({ error: "Failed to generate tracking code." });
    }

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

    let coords;
    try {
      coords = await geocode(deliveryAddress);
    } catch (error) {
      console.error("Error geocoding address:", error);
      return res.status(500).json({ error: "Failed to geocode address." });
    }

    if (coords) {
      await axios.post(`${process.env.GEO_URL}/locations`, {
        deliveryPersonId: delivery.id,
        orderId: order.id,
        location: {
          type: "Point",
          coordinates: [coords.lng, coords.lat],
        },
      });
    }

    res.status(201).json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: error.message || "Failed to create order." });
  }
};

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
};

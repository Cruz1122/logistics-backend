const prisma = require("../config/prisma");

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

const createOrder = async (req, res) => {
  const { id, customerId, deliveryId, status, deliveryAddress, estimatedDeliveryTime, totalAmount } = req.body;
  try {
    const order = await prisma.order.create({
      data: {
        id,
        customerId,
        deliveryId,
        status,
        deliveryAddress,
        estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined,
        totalAmount,
      },
    });
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create order." });
  }
};

const updateOrder = async (req, res) => {
  const { deliveryId, status, deliveryAddress, estimatedDeliveryTime, totalAmount } = req.body;
  try {
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        deliveryId,
        status,
        deliveryAddress,
        estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined,
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
};

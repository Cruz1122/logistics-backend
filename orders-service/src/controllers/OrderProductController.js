const prisma = require("../config/prisma");

const getAllOrderProducts = async (req, res) => {
  try {
    const orderProducts = await prisma.orderProduct.findMany();
    res.json(orderProducts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order products." });
  }
};

const getOrderProductById = async (req, res) => {
  try {
    const orderProduct = await prisma.orderProduct.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!orderProduct) return res.status(404).json({ error: "Not found." });
    res.json(orderProduct);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order product." });
  }
};

const createOrderProduct = async (req, res) => {
  const { orderId, productId, quantity, unitPrice } = req.body;
  try {
    const created = await prisma.orderProduct.create({
      data: { orderId, productId, quantity, unitPrice },
    });
    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create order product." });
  }
};

const updateOrderProduct = async (req, res) => {
  const { quantity, unitPrice } = req.body;
  try {
    const updated = await prisma.orderProduct.update({
      where: { id: parseInt(req.params.id) },
      data: { quantity, unitPrice },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order product." });
  }
};

const deleteOrderProduct = async (req, res) => {
  try {
    await prisma.orderProduct.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Order product deleted." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete order product." });
  }
};

module.exports = {
  getAllOrderProducts,
  getOrderProductById,
  createOrderProduct,
  updateOrderProduct,
  deleteOrderProduct,
};

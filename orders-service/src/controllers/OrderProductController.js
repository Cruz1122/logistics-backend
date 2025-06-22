const prisma = require("../config/prisma");

/**
 * Retrieves all order-product relations from the database.
 * Responds with a JSON array of order products.
 */
const getAllOrderProducts = async (req, res) => {
  try {
    const orderProducts = await prisma.orderProduct.findMany();
    res.json(orderProducts);
  } catch (error) {
    console.error("Error fetching order products:", error);
    res.status(500).json({ error: "Failed to fetch order products." });
  }
};

/**
 * Retrieves a specific order-product relation by its ID.
 * Responds with the order product object if found, or 404 if not found.
 * @param {string} req.params.id - The ID of the order product to retrieve.
 */
const getOrderProductById = async (req, res) => {
  try {
    const orderProduct = await prisma.orderProduct.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!orderProduct) return res.status(404).json({ error: "Not found." });
    res.json(orderProduct);
  } catch (error) {
    console.error("Error fetching order product by ID:", error);
    res.status(500).json({ error: "Failed to fetch order product." });
  }
};

/**
 * Creates a new order-product relation with the provided data.
 * Responds with the created order product object.
 * @param {string} req.body.orderId - The order ID.
 * @param {string} req.body.productId - The product ID.
 * @param {number} req.body.quantity - The quantity of the product.
 * @param {number} req.body.unitPrice - The unit price of the product.
 */
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

/**
 * Updates an order-product relation by its ID.
 * Responds with the updated order product object.
 * @param {string} req.params.id - The ID of the order product to update.
 * @param {number} req.body.quantity - The new quantity.
 * @param {number} req.body.unitPrice - The new unit price.
 */
const updateOrderProduct = async (req, res) => {
  const { quantity, unitPrice } = req.body;
  try {
    const updated = await prisma.orderProduct.update({
      where: { id: parseInt(req.params.id) },
      data: { quantity, unitPrice },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating order product:", error);
    res.status(500).json({ error: "Failed to update order product." });
  }
};

/**
 * Deletes an order-product relation by its ID.
 * Responds with a success message if deleted.
 * @param {string} req.params.id - The ID of the order product to delete.
 */
const deleteOrderProduct = async (req, res) => {
  try {
    await prisma.orderProduct.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Order product deleted." });
  } catch (error) {
    console.error("Error deleting order product:", error);
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
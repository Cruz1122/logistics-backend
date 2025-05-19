const prisma = require("../config/prisma");

const getAllDeliveryPersons = async (req, res) => {
  try {
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      include: { orders: true },
    });
    res.json(deliveryPersons);
  } catch (error) {
    console.error("Error fetching delivery persons:", error);
    res.status(500).json({ error: "Failed to fetch delivery persons." });
  }
};

const getDeliveryPersonById = async (req, res) => {
  try {
    const person = await prisma.deliveryPerson.findUnique({
      where: { id: req.params.id },
      include: { orders: true },
    });
    if (!person) return res.status(404).json({ error: "Not found" });
    res.json(person);
  } catch (error) {
    console.error("Error fetching delivery person:", error);
    res.status(500).json({ error: "Failed to fetch delivery person." });
  }
};

const createDeliveryPerson = async (req, res) => {
  const { id, idUser, name, latitude, longitude } = req.body;
  try {
    const person = await prisma.deliveryPerson.create({
      data: { id, idUser, name, latitude, longitude },
    });
    res.status(201).json(person);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create delivery person." });
  }
};

const updateDeliveryPerson = async (req, res) => {
  const { idUser, name, latitude, longitude } = req.body;
  try {
    const updated = await prisma.deliveryPerson.update({
      where: { id: req.params.id },
      data: { idUser, name, latitude, longitude },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating delivery person:", error);
    res.status(500).json({ error: "Failed to update delivery person." });
  }
};

const deleteDeliveryPerson = async (req, res) => {
  try {
    await prisma.deliveryPerson.delete({ where: { id: req.params.id } });
    res.json({ message: "Delivery person deleted." });
  } catch (error) {
    console.error("Error deleting delivery person:", error);
    res.status(500).json({ error: "Failed to delete delivery person." });
  }
};

module.exports = {
  getAllDeliveryPersons,
  getDeliveryPersonById,
  createDeliveryPerson,
  updateDeliveryPerson,
  deleteDeliveryPerson,
};

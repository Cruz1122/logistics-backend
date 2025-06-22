const prisma = require("../config/prisma");


/**
 * Retrieves all delivery persons from the database, including their orders.
 * Responds with a JSON array of delivery persons.
 */
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


/**
 * Retrieves a delivery person by their ID, including their orders.
 * Responds with the delivery person object if found, or 404 if not found.
 * @param {string} req.params.id - The ID of the delivery person to retrieve.
 */
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


/**
 * Retrieves a delivery person by their associated user ID.
 * Responds with the delivery person ID if found, or 404 if not found.
 * @param {string} req.params.idUser - The user ID associated with the delivery person.
 */
const getDeliveryPersonByUserId = async (req, res) => {
  const { idUser } = req.params;
  try {
    const person = await prisma.deliveryPerson.findFirst({
      where: { idUser },
    });
    if (!person) return res.status(404).json({ error: "Not found" });

    const deliveryPersonId = person.id;
    res.json(deliveryPersonId);
  } catch (error) {
    console.error("Error fetching delivery person by user ID:", error);
    res.status(500).json({ error: "Failed to fetch delivery person by user ID." });
  }
};


/**
 * Creates a new delivery person with the provided data.
 * Responds with the created delivery person object.
 * @param {string} req.body.id - The ID for the new delivery person.
 * @param {string} req.body.idUser - The associated user ID.
 * @param {string} req.body.name - The name of the delivery person.
 * @param {number} req.body.latitude - The latitude coordinate.
 * @param {number} req.body.longitude - The longitude coordinate.
 */
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


/**
 * Updates a delivery person's information by their ID.
 * Responds with the updated delivery person object.
 * @param {string} req.params.id - The ID of the delivery person to update.
 */
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


/**
 * Deletes a delivery person by their ID.
 * Responds with a success message if deleted.
 * @param {string} req.params.id - The ID of the delivery person to delete.
 */
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
  getDeliveryPersonByUserId
};

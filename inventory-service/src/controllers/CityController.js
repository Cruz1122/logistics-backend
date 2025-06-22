const prisma = require("../config/prisma");

module.exports = {
  // Get all cities
  async getAll(req, res) {
    try {
      const cities = await prisma.city.findMany({
        include: { state: true, warehouses: true }, // opcional: trae relaciones
      });
      res.json(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  },

  // Get a city by ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const city = await prisma.city.findUnique({
        where: { id },
        include: { state: true, warehouses: true },
      });
      if (!city) {
        return res.status(404).json({ error: "City not found" });
      }
      res.json(city);
    } catch (error) {
      console.error("Error fetching city:", error);
      res.status(500).json({ error: "Failed to fetch city" });
    }
  },

  // Create a new city
  async create(req, res) {
    const { name, stateId } = req.body;
    try {
      const newCity = await prisma.city.create({
        data: {
          name,
          stateId,
        },
      });
      res.status(201).json(newCity);
    } catch (error) {
      console.error("Error creating city:", error);
      res.status(500).json({ error: "Failed to create city" });
    }
  },

  // Update a city
  async update(req, res) {
    const { id } = req.params;
    const { name, stateId } = req.body;
    try {
      const updatedCity = await prisma.city.update({
        where: { id },
        data: {
          name,
          stateId,
        },
      });
      res.json(updatedCity);
    } catch (error) {
      console.error("Error updating city:", error);
      res.status(500).json({ error: "Failed to update city" });
    }
  },

  // Delete a city
  async remove(req, res) {
    const { id } = req.params;
    try {
      await prisma.city.delete({ where: { id } });
      res.json({ message: "City deleted successfully" });
    } catch (error) {
      console.error("Error deleting city:", error);
      res.status(500).json({ error: "Failed to delete city" });
    }
  },
};

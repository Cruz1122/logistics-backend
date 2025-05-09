const prisma = require("../config/prisma");

module.exports = {
  // Get all states
  async getAll(req, res) {
    try {
      const states = await prisma.state.findMany({
        include: { cities: true }, // opcional: incluye las ciudades relacionadas
      });
      res.json(states);
    } catch (error) {
      console.error("Error fetching states:", error);
      res.status(500).json({ error: "Failed to fetch states" });
    }
  },

  // Get a state by ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const state = await prisma.state.findUnique({
        where: { id },
        include: { cities: true }, // opcional
      });
      if (!state) {
        return res.status(404).json({ error: "State not found" });
      }
      res.json(state);
    } catch (error) {
      console.error("Error fetching state:", error);
      res.status(500).json({ error: "Failed to fetch state" });
    }
  },

  // Create a new state
  async create(req, res) {
    const { name } = req.body;
    try {
      const newState = await prisma.state.create({
        data: { name },
      });
      res.status(201).json(newState);
    } catch (error) {
      console.error("Error creating state:", error);
      res.status(500).json({ error: "Failed to create state" });
    }
  },

  // Update a state
  async update(req, res) {
    const { id } = req.params;
    const { name } = req.body;
    try {
      const updatedState = await prisma.state.update({
        where: { id },
        data: { name },
      });
      res.json(updatedState);
    } catch (error) {
      console.error("Error updating state:", error);
      res.status(500).json({ error: "Failed to update state" });
    }
  },

  // Delete a state
  async remove(req, res) {
    const { id } = req.params;
    try {
      await prisma.state.delete({ where: { id } });
      res.json({ message: "State deleted successfully" });
    } catch (error) {
      console.error("Error deleting state:", error);
      res.status(500).json({ error: "Failed to delete state" });
    }
  },
};

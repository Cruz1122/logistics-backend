const prisma = require("../config/prisma");

module.exports = {
  // Get all warehouses
  async getAll(req, res) {
    try {
      const warehouses = await prisma.warehouse.findMany({
        include: {
          cityRelation: true,
          productWarehouses: true,
        },
      });
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ error: "Failed to fetch warehouses" });
    }
  },

  // Get a warehouse by ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: {
          cityRelation: true,
          productWarehouses: true,
        },
      });
      if (!warehouse) {
        return res.status(404).json({ error: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      console.error("Error fetching warehouse:", error);
      res.status(500).json({ error: "Failed to fetch warehouse" });
    }
  },

  // Create a new warehouse
  async create(req, res) {
    const {
      name,
      address,
      postalCode,
      latitude,
      longitude,
      capacityM2,
      status,
      managerId,
      cityId,
    } = req.body;

    try {
      const newWarehouse = await prisma.warehouse.create({
        data: {
          name,
          address,
          postalCode,
          latitude,
          longitude,
          capacityM2,
          status,
          managerId,
          cityId,
        },
      });
      res.status(201).json(newWarehouse);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(500).json({ error: "Failed to create warehouse" });
    }
  },

  // Update a warehouse
  async update(req, res) {
    const { id } = req.params;
    const data = req.body;

    try {
      const updated = await prisma.warehouse.update({
        where: { id },
        data,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating warehouse:", error);
      res.status(500).json({ error: "Failed to update warehouse" });
    }
  },

  // Delete a warehouse
  async remove(req, res) {
    const { id } = req.params;
    try {
      await prisma.warehouse.delete({ where: { id } });
      res.json({ message: "Warehouse deleted successfully" });
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      res.status(500).json({ error: "Failed to delete warehouse" });
    }
  },
};

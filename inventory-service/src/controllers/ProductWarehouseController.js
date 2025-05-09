const prisma = require("../config/prisma");
module.exports = {
  // Get all records
  async getAll(req, res) {
    try {
      const records = await prisma.productWarehouse.findMany({
        include: {
          product: true,
          warehouse: true,
        },
      });
      res.json(records);
    } catch (error) {
      console.error("Error fetching productWarehouse records:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch product-warehouse records" });
    }
  },

  // Get record by ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const record = await prisma.productWarehouse.findUnique({
        where: { id },
        include: {
          product: true,
          warehouse: true,
        },
      });
      if (!record) {
        return res.status(404).json({ error: "Record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching record:", error);
      res.status(500).json({ error: "Failed to fetch record" });
    }
  },

  // Create new record
  async create(req, res) {
    const {
      productId,
      warehouseId,
      stockQuantity,
      reorderLevel,
      lastRestock,
      expirationDate,
      status,
    } = req.body;

    try {
      const newRecord = await prisma.productWarehouse.create({
        data: {
          productId,
          warehouseId,
          stockQuantity,
          reorderLevel,
          lastRestock: new Date(lastRestock),
          expirationDate: new Date(expirationDate),
          status,
        },
      });
      res.status(201).json(newRecord);
    } catch (error) {
      console.error("Error creating record:", error);
      res.status(500).json({ error: "Failed to create record" });
    }
  },

  // Update record
  async update(req, res) {
    const { id } = req.params;
    const data = req.body;

    try {
      if (data.lastRestock) data.lastRestock = new Date(data.lastRestock);
      if (data.expirationDate)
        data.expirationDate = new Date(data.expirationDate);

      const updated = await prisma.productWarehouse.update({
        where: { id },
        data,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating record:", error);
      res.status(500).json({ error: "Failed to update record" });
    }
  },

  // Delete record
  async remove(req, res) {
    const { id } = req.params;
    try {
      await prisma.productWarehouse.delete({ where: { id } });
      res.json({ message: "Record deleted successfully" });
    } catch (error) {
      console.error("Error deleting record:", error);
      res.status(500).json({ error: "Failed to delete record" });
    }
  },
};

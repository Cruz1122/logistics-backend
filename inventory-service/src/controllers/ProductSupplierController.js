const prisma = require("../config/prisma"); // Asegúrate de que la ruta sea correcta

module.exports = {
  // Get all product-supplier records
  async getAll(req, res) {
    try {
      const records = await prisma.productSupplier.findMany({
        include: {
          product: true,
          supplier: true,
        },
      });
      res.json(records);
    } catch (error) {
      console.error("Error fetching product-supplier records:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch product-supplier records" });
    }
  },

  // Get record by ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const record = await prisma.productSupplier.findUnique({
        where: { id },
        include: {
          product: true,
          supplier: true,
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

  // Create new product-supplier relationship
  async create(req, res) {
    const { productId, supplierId } = req.body;

    try {
      const newRecord = await prisma.productSupplier.create({
        data: {
          productId,
          supplierId,
        },
      });
      res.status(201).json(newRecord);
    } catch (error) {
      console.error("Error creating record:", error);
      res.status(500).json({ error: "Failed to create record" });
    }
  },

  // Update relationship
  async update(req, res) {
    const { id } = req.params;
    const data = req.body;

    try {
      const updated = await prisma.productSupplier.update({
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
      await prisma.productSupplier.delete({ where: { id } });
      res.json({ message: "Record deleted successfully" });
    } catch (error) {
      console.error("Error deleting record:", error);
      res.status(500).json({ error: "Failed to delete record" });
    }
  },
};

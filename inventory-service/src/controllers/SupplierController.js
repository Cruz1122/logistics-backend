const prisma = require("../config/prisma");

module.exports = {
  // Get all suppliers
  async getAll(req, res) {
    try {
      const suppliers = await prisma.supplier.findMany({
        include: {
          productSuppliers: true,
        },
      });
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  },

  // Get supplier by ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          productSuppliers: true,
        },
      });
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  },

  // Create supplier
  async create(req, res) {
    const { name, phone, email } = req.body;

    try {
      const newSupplier = await prisma.supplier.create({
        data: {
          name,
          phone,
          email,
        },
      });
      res.status(201).json(newSupplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ error: "Failed to create supplier" });
    }
  },

  // Update supplier
  async update(req, res) {
    const { id } = req.params;
    const data = req.body;

    try {
      const updated = await prisma.supplier.update({
        where: { id },
        data,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  },

  // Delete supplier
  async remove(req, res) {
    const { id } = req.params;

    try {
      await prisma.supplier.delete({ where: { id } });
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  },
};

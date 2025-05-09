const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { schema: "inventory_service" } },
});

module.exports = {
  // Get all categories
  async getAll(req, res) {
    try {
      const categories = await prisma.category.findMany();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  },

  // Get a category by ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ error: "Failed to fetch category" });
    }
  },

  // Create a new category
  async create(req, res) {
    const { name } = req.body;
    try {
      const newCategory = await prisma.category.create({
        data: { name },
      });
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  },

  // Update a category
  async update(req, res) {
    const { id } = req.params;
    const { name } = req.body;
    try {
      const updated = await prisma.category.update({
        where: { id },
        data: { name },
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  },

  // Delete a category
  async remove(req, res) {
    const { id } = req.params;
    try {
      await prisma.category.delete({ where: { id } });
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  },
};

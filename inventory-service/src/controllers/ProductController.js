const prisma = require("../config/prisma");

module.exports = {
  // Get all products
  async getAll(req, res) {
    try {
      const products = await prisma.product.findMany({
        include: {
          category: true,
          productWarehouses: true,
          productSuppliers: true,
        },
      });
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },

  // Get product by ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          productWarehouses: true,
          productSuppliers: true,
        },
      });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  },

  // Create new product
  async create(req, res) {
    const {
      name,
      description,
      sku,
      barcode,
      unitPrice,
      weightKg,
      dimensions,
      isFragile,
      needsCooling,
      categoryId,
    } = req.body;

    try {
      const newProduct = await prisma.product.create({
        data: {
          name,
          description,
          sku,
          barcode,
          unitPrice,
          weightKg,
          dimensions,
          isFragile,
          needsCooling,
          categoryId,
        },
      });
      res.status(201).json(newProduct);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  },

  // Update product
  async update(req, res) {
    const { id } = req.params;
    const data = req.body;

    try {
      const updated = await prisma.product.update({
        where: { id },
        data,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  },

  // Delete product
  async remove(req, res) {
    const { id } = req.params;
    try {
      await prisma.product.delete({ where: { id } });
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  },
};

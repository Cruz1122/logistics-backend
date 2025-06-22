const prisma = require("../config/prisma");
const { sendStockEmail } = require("../utils/mailer");
const axios = require("axios");

// Función auxiliar para registrar movimientos
async function registerMovement({
  productWarehouseId,
  movementType,
  quantityMoved,
  stockAfter,
  performedById = null,
  notes = null,
}) {
  await prisma.productWarehouseMovement.create({
    data: {
      productWarehouseId,
      movementType,
      quantityMoved,
      stockAfter,
      performedById,
      notes,
    },
  });
}

async function sendLowStockAlert(productWarehouse, req) {
  const { reorderLevel, stockQuantity, productId, warehouseId } =
    productWarehouse;

  if (reorderLevel && stockQuantity <= reorderLevel) {
    let dispatchers = [];
    try {
      const response = await axios.get(`${process.env.AUTH_URL}/users/users/`, {
        headers: {
          Authorization: req.headers.authorization || "",
        },
      });
      dispatchers = response.data.filter(
        (user) => user.role?.name === "Dispatcher"
      );
    } catch (err) {
      console.error("Error fetching dispatchers from auth-service:", err);
    }

    if (dispatchers.length) {
      const dispatchEmails = dispatchers.map((u) => u.email);
      const subject = "Low Stock Alert";
      const message = `The stock for product <strong>${productId}</strong> in warehouse <strong>${warehouseId}</strong> is less than or equal to the reorder level (${reorderLevel}). Current stock: ${stockQuantity}.
        <br>Please take the necessary actions to restock.
        <br><br>This is an automated message, please do not reply.`;

      const emailSent = await sendStockEmail(dispatchEmails, subject, message);
      if (emailSent) {
        console.log("Low stock alert sent to Dispatchers");
      } else {
        console.error("Failed to send low stock alert");
      }
    }
  }
}


module.exports = {
  // Get all records
  async getAll(req, res) {
    try {
      const records = await prisma.productWarehouse.findMany({
        where: { deletedAt: null }, // only non-deleted records
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
      if (!record || record.deletedAt) {
        return res.status(404).json({ error: "Record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching record:", error);
      res.status(500).json({ error: "Failed to fetch record" });
    }
  },

  // Create new record + initial movement
  async create(req, res) {
    const {
      productId,
      warehouseId,
      stockQuantity = 0,
      reorderLevel,
      lastRestock,
      expirationDate,
      status,
      performedById, // optional: who does the action
    } = req.body;

    try {
      const existingRecord = await prisma.productWarehouse.findFirst({
        where: {
          productId,
          warehouseId,
          deletedAt: null, // only non-deleted records
        },
      });

      if (existingRecord) {
        return res.status(400).json({
          error: "Record already exists for this product and warehouse",
        });
      }

      const newRecord = await prisma.productWarehouse.create({
        data: {
          productId,
          warehouseId,
          stockQuantity,
          reorderLevel,
          lastRestock: lastRestock ? new Date(lastRestock) : undefined,
          expirationDate: expirationDate ? new Date(expirationDate) : undefined,
          status,
        },
      });

      // Record initial movement if stockQuantity > 0
      if (stockQuantity > 0) {
        await registerMovement({
          productWarehouseId: newRecord.id,
          movementType: "CREATION",
          quantityMoved: stockQuantity,
          stockAfter: stockQuantity,
          performedById,
          notes: "Initial stock when creating record",
        });
      }

      await sendLowStockAlert(newRecord, req);

      res.status(201).json(newRecord);
    } catch (error) {
      console.error("Error creating record:", error);
      res.status(500).json({ error: "Failed to create record" });
    }
  },

  // Update record + movement record if stock changes
  async update(req, res) {
    const { id } = req.params;
    const data = req.body;
    const performedById = data.performedById || null;

    try {
      if (data.lastRestock) data.lastRestock = new Date(data.lastRestock);
      if (data.expirationDate)
        data.expirationDate = new Date(data.expirationDate);

      // Get the current record to compare stock
      const currentRecord = await prisma.productWarehouse.findUnique({
        where: { id },
      });
      if (!currentRecord)
        return res.status(404).json({ error: "Record not found" });

      const currentStock = currentRecord.stockQuantity || 0;
      const newStock =
        data.stockQuantity !== undefined ? data.stockQuantity : currentStock;

      const updated = await prisma.productWarehouse.update({
        where: { id },
        data,
      });

      // Record movement only if stock changed
      if (newStock !== currentStock) {
        const quantityMoved = newStock - currentStock;

        await registerMovement({
          productWarehouseId: id,
          movementType: "UPDATE",
          quantityMoved,
          stockAfter: newStock,
          performedById,
          notes: "Stock update",
        });
      }

      await sendLowStockAlert(updated, req);

      res.json(updated);
    } catch (error) {
      console.error("Error updating record:", error);
      res.status(500).json({ error: "Failed to update record" });
    }
  },

  // Delete record + record movement DELETE
  async remove(req, res) {
    const { id } = req.params;
    const performedById = req.body?.performedById || null;

    try {
      const currentRecord = await prisma.productWarehouse.findUnique({
        where: { id },
        include: { product: true, warehouse: true },
      });

      if (!currentRecord)
        return res.status(404).json({ error: "Record not found" });

      if (currentRecord.deletedAt) {
        return res.status(400).json({ error: "Record already deleted" });
      }

      const notes = JSON.stringify({
        productId: currentRecord.productId,
        warehouseId: currentRecord.warehouseId,
        stockQuantity: currentRecord.stockQuantity,
        status: currentRecord.status,
        productName: currentRecord.product?.name,
        warehouseName: currentRecord.warehouse?.name,
      });

      await registerMovement({
        productWarehouseId: id,
        movementType: "SOFT_DELETE",
        quantityMoved: -currentRecord.stockQuantity,
        stockAfter: 0,
        performedById,
        notes: `Record marked as deleted: ${notes}`,
      });

      await prisma.productWarehouse.update({
        where: { id },
        data: { deletedAt: new Date(), stockQuantity: 0 },
      });

      res.json({ message: "Record soft deleted successfully" });
    } catch (error) {
      console.error("Error soft deleting record:", error);
      res.status(500).json({ error: "Failed to soft delete record" });
    }
  },
  // PATCH: Decrement stock for a product in a warehouse
  async decrementStock(req, res) {
    const { productId, quantity, performedById } = req.body;

    if (!productId || typeof quantity !== "number" || quantity <= 0) {
      return res.status(400).json({ error: "productId and positive quantity are required" });
    }

    try {
      // Find the first warehouse with that productId and sufficient stock
      const productWarehouse = await prisma.productWarehouse.findFirst({
        where: {
          productId,
          stockQuantity: { gte: quantity },
          deletedAt: null,
        },
      });

      if (!productWarehouse) {
        return res.status(404).json({ error: "No warehouse found with enough stock for this productId" });
      }

      const newStock = productWarehouse.stockQuantity - quantity;

      // Update the stock
      const updated = await prisma.productWarehouse.update({
        where: { id: productWarehouse.id },
        data: { stockQuantity: newStock },
      });

      // Record stock movement
      await registerMovement({
        productWarehouseId: productWarehouse.id,
        movementType: "DECREMENT",
        quantityMoved: -quantity,
        stockAfter: newStock,
        performedById: performedById || null,
        notes: "Stock discount per order",
      });

      await sendLowStockAlert(updated, req);

      res.json(updated);
    } catch (error) {
      console.error("Error decrementing stock:", error);
      res.status(500).json({ error: "Failed to decrement stock" });
    }
  },

};

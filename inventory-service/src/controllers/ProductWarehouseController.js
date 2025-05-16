const prisma = require("../config/prisma");

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

module.exports = {
  // Get all records
  async getAll(req, res) {
    try {
      const records = await prisma.productWarehouse.findMany({
        where: { deletedAt: null }, // solo registros no eliminados
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

  // Create new record + movimiento inicial
  async create(req, res) {
    const {
      productId,
      warehouseId,
      stockQuantity = 0,
      reorderLevel,
      lastRestock,
      expirationDate,
      status,
      performedById, // opcional: quién hace la acción
    } = req.body;

    try {
      const existingRecord = await prisma.productWarehouse.findFirst({
        where: {
          productId,
          warehouseId,
          deletedAt: null, // solo registros no eliminados
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

      // Registrar movimiento inicial si stockQuantity > 0
      if (stockQuantity > 0) {
        await registerMovement({
          productWarehouseId: newRecord.id,
          movementType: "CREATION",
          quantityMoved: stockQuantity,
          stockAfter: stockQuantity,
          performedById,
          notes: "Stock inicial al crear registro",
        });
      }

      res.status(201).json(newRecord);
    } catch (error) {
      console.error("Error creating record:", error);
      res.status(500).json({ error: "Failed to create record" });
    }
  },

  // Update record + registro de movimiento si cambia stock
  async update(req, res) {
    const { id } = req.params;
    const data = req.body;
    const performedById = data.performedById || null;

    try {
      if (data.lastRestock) data.lastRestock = new Date(data.lastRestock);
      if (data.expirationDate)
        data.expirationDate = new Date(data.expirationDate);

      // Obtener el registro actual para comparar stock
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

      // Registrar movimiento solo si cambió stock
      if (newStock !== currentStock) {
        const quantityMoved = newStock - currentStock;

        await registerMovement({
          productWarehouseId: id,
          movementType: "UPDATE",
          quantityMoved,
          stockAfter: newStock,
          performedById,
          notes: "Actualización de stock",
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating record:", error);
      res.status(500).json({ error: "Failed to update record" });
    }
  },

  // Delete record + registrar movimiento DELETE
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
        notes: `Registro marcado como eliminado: ${notes}`,
      });

      await prisma.productWarehouse.update({
        where: { id },
        data: { deletedAt: new Date(),
          stockQuantity: 0, 
         },
      });

      res.json({ message: "Record soft deleted successfully" });
    } catch (error) {
      console.error("Error soft deleting record:", error);
      res.status(500).json({ error: "Failed to soft delete record" });
    }
  },
};

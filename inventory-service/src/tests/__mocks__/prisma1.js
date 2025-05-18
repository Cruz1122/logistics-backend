const mockPrisma = {
  warehouse: { findMany: jest.fn() },
  supplier: { findMany: jest.fn(), createMany: jest.fn() },
  category: { findMany: jest.fn(), createMany: jest.fn() },
  product: { findMany: jest.fn(), createMany: jest.fn() },
  productWarehouse: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  productSupplier: { findMany: jest.fn(), createMany: jest.fn() },
  productWarehouseMovement: { createMany: jest.fn() },
};

module.exports = { mockPrisma };
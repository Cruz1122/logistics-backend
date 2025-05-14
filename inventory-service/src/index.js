const express = require("express");
const categoryRoutes = require("./routes/CategoryRoutes");
const stateRoutes = require("./routes/StateRoutes");
const cityRoutes = require("./routes/CityRoutes");
const warehouseRoutes = require("./routes/WarehouseRoutes");
const productRoutes = require("./routes/ProductRoutes");
const productWarehouseRoutes = require("./routes/ProductWarehouseRoutes");
const supplierRoutes = require("./routes/SupplierRoutes");
const productSupplierRoutes = require("./routes/ProductSupplierRoutes");
const csvRoutes = require("./routes/csvRoutes");
const inventoryRoutes = require("./routes/InventoryRoutes");

const app = express();
const PORT = process.env.INVENTORY_PORT || 4003;

app.get("/", (_, res) => res.send("Inventory Service OK"));
app.listen(PORT, () => console.log(`Inventory Service on port ${PORT}`));

app.use(express.json());
app.use("/category", categoryRoutes);
app.use("/state", stateRoutes);
app.use("/city", cityRoutes);
app.use("/warehouse", warehouseRoutes);
app.use("/product", productRoutes);
app.use("/product-warehouse", productWarehouseRoutes);
app.use("/supplier", supplierRoutes);
app.use("/product-supplier", productSupplierRoutes);
app.use("/csv", csvRoutes);
app.use("/inventory", inventoryRoutes);

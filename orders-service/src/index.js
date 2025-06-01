const express = require("express");
const app = express();
const PORT = process.env.ORDERS_PORT || 4004;
const deliveryPersonRoutes = require("./routes/DeliveryPersonRoutes");
const orderRoutes = require("./routes/orderRoutes");
const orderProductRoutes = require("./routes/OrderProductRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");

app.use(express.json());
app.get("/", (_, res) => res.send("Orders Service OK"));
app.listen(PORT, () => console.log(`Orders Service on port ${PORT}`));
app.use("/delivery-persons", deliveryPersonRoutes);
app.use("/orders", orderRoutes);
app.use("/order-products", orderProductRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

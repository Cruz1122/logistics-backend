const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;
app.get("/", (req, res) => res.send("Gateway is alive!"));

app.use(cors({
  origin: "*", // Permitir todas las URLs
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const SERVICES = {
  auth: process.env.AUTH_URL || "http://auth-service:4001",
  geo: process.env.GEO_URL || "http://geo-service:4002",
  inventory: process.env.INVENTORY_URL || "http://inventory-service:4003",
  orders: process.env.ORDERS_URL || "http://orders-service:4004",
  reports: process.env.REPORTS_URL || "http://reports-service:4005",
};

app.use(
  "/auth",
  createProxyMiddleware({
    target: SERVICES.auth,
    changeOrigin: true,
  })
);

app.use(
  "/geo",
  createProxyMiddleware({
    target: SERVICES.geo,
    changeOrigin: true,
  })
);

app.use(
  "/inventory",
  createProxyMiddleware({
    target: SERVICES.inventory,
    changeOrigin: true,
  })
);

app.use(
  "/orders",
  createProxyMiddleware({
    target: SERVICES.orders,
    changeOrigin: true,
  })
);

app.use(
  "/reports",
  createProxyMiddleware({
    target: SERVICES.reports,
    changeOrigin: true,
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
})

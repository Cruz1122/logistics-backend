const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.GATEWAY_PORT;

app.get("/", (req, res) => res.send("Gateway is alive!"));

app.use(cors({
  origin: "*", // Permitir todas las URLs
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const SERVICES = {
  auth: process.env.AUTH_URL,
  geo: process.env.GEO_URL,
  inventory: process.env.INVENTORY_URL,
  orders: process.env.ORDERS_URL,
  reports: process.env.REPORTS_URL,
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

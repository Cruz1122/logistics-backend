const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.GATEWAY_PORT;

app.use(express.static(path.join(__dirname, 'public')));

// 2. Root path: returns status page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(cors({
  origin: "*", // Allow all URLs
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
    ws: true, // Enable WebSocket if needed
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

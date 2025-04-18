const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

app.use(
  "/auth",
  createProxyMiddleware({
    target: "http://auth-service:4001",
    changeOrigin: true,
  })
);

app.use(
  "/geo",
  createProxyMiddleware({
    target: "http://geo-service:4002",
    changeOrigin: true,
  })
);

app.use(
  "/inventory",
  createProxyMiddleware({
    target: "http://inventory-service:4003",
    changeOrigin: true,
  })
);

app.use(
  "/orders",
  createProxyMiddleware({
    target: "http://orders-service:4004",
    changeOrigin: true,
  })
);

app.use
(
  "/reports",
  createProxyMiddleware({
    target: "http://reports-service:4005",
    changeOrigin: true,
  })
);

app.listen(3000, () => {
  console.log("API Gateway listening on port 3000");
});

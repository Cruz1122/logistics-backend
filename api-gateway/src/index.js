const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;
app.get("/", (req, res) => res.send("Gateway is alive!"));

app.use(
  "/auth",
  createProxyMiddleware({
    target: "http://auth-service:4001",
    changeOrigin: true,
    pathRewrite: {
      "^/auth": "", // esto elimina "/auth" del path antes de enviar al microservicio
    },
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

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
})

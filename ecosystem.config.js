module.exports = {
  apps: [
    {
      name: "auth",
      script: "auth-service/index.js",
      watch: false,
    },
    {
      name: "inventory",
      script: "inventory-service/index.js",
      watch: false,
    },
    {
      name: "orders",
      script: "orders-service/index.js",
      watch: false,
    },
    {
      name: "geo",
      script: "geo-service/index.js",
      watch: false,
    },
    {
      name: "reports",
      script: "reports-service/index.js",
      watch: false,
    },
    {
      name: "gateway",
      script: "api-gateway/index.js",
      watch: false,
    },
  ],
};

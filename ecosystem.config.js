module.exports = {
  apps: [
    {
      name: "auth",
      script: "auth-service/src/index.js",
      watch: false,
    },
    {
      name: "inventory",
      script: "inventory-service/src/index.js",
      watch: false,
    },
    {
      name: "orders",
      script: "orders-service/src/index.js",
      watch: false,
    },
    {
      name: "geo",
      script: "geo-service/src/index.js",
      watch: false,
    },
    {
      name: "reports",
      script: "reports-service/src/index.js",
      watch: false,
    },
    {
      name: "gateway",
      script: "api-gateway/src/index.js",
      watch: false,
    },
  ],
};

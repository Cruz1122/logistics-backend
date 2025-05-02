const swaggerJSDoc = require("swagger-jsdoc");
require("dotenv").config();
const GATEWAY_URL = process.env.GATEWAY_URL;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Auth Service API",
    version: "1.0.0",
    description: "Documentación de la API de autenticación",
  },
  servers: [
    {
      url: `${GATEWAY_URL}/auth`,
      description: "API Gateway",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.js"], // Aquí apuntamos a tus rutas documentadas
};

module.exports = swaggerJSDoc(options);
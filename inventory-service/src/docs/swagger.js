const swaggerJSDoc = require("swagger-jsdoc");
const path = require("path");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Inventory-service API",
    version: "1.0.0",
    description: "Documentación de la API de Inventory",
  },
  servers: [
    {
      url: `/inventory`,
      description: "Inventory-service API",
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
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [path.join(__dirname, "../routes/*.js")], // Aquí apuntamos a las rutas documentadas
};

module.exports = swaggerJSDoc(options);
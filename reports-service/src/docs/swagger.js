const swaggerJSDoc = require("swagger-jsdoc");
const path = require("path");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Reports Service API",
    version: "1.0.0",
    description: "API documentation for the reports microservice",
  },
  servers: [
    {
      url: `/reports`,
      description: "Report Service API",
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

const { PrismaClient } = require("@prisma/client");

// Crea una única instancia del cliente para evitar múltiples conexiones
const prisma = new PrismaClient();

module.exports = prisma;

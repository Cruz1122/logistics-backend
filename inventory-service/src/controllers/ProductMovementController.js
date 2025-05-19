const { productWarehouse } = require("../../../orders-service/src/config/prisma");
const prisma = require("../config/prisma");
const { getAll } = require("./CategoryController");

module.exports = {
    async getAll (req, res) {
        try {
            const productMovements = await prisma.productWarehouseMovement.findMany({
                include: {
                    productWarehouse: true,
                },
            });
            res.status(200).json(productMovements);
        } catch (error) {
            console.error("Error fetching product movements:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

}
const prisma = require("../config/prisma");

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

    async getById (req, res) {
        const { id } = req.params;
        try {
            const productMovement = await prisma.productWarehouseMovement.findUnique({
                where: { id },
                include: {
                    productWarehouse: true,
                },
            });
            if (!productMovement) {
                return res.status(404).json({ error: "Product movement not found" });
            }
            res.status(200).json(productMovement);
        } catch (error) {
            console.error("Error fetching product movement:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}
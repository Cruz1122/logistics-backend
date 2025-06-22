const prisma = require("../config/prisma");

module.exports = {
    /**
     * Retrieves all product warehouse movements from the database,
     * including the associated product warehouse details.
     * Responds with a JSON array of product movements.
     */
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

    /**
     * Retrieves a specific product warehouse movement by its ID,
     * including the associated product warehouse details.
     * Responds with the movement object if found, or 404 if not found.
     * @param {string} req.params.id - The ID of the product movement to retrieve.
     */
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
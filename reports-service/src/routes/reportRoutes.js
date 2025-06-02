const express = require("express");
const router = express.Router();
const { generateDeliveryReport, generateDeliveryReportXlsx } = require("../controllers/reportController");
const { authenticateJWT } = require("../middlewares/Auth"); // si lo estás usando


/**
 * @swagger
 * /reports/reports/delivery-report/{deliveryId}:
 *   get:
 *     summary: Generate and download PDF report for a delivery person
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the delivery person
 *     responses:
 *       200:
 *         description: PDF file containing the delivery report
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing deliveryId
 *       500:
 *         description: Internal server error
 */
router.get("/delivery-report/:deliveryId", authenticateJWT, generateDeliveryReport);
router.get("/delivery-report-excel/:deliveryId", authenticateJWT, generateDeliveryReportXlsx);
module.exports = router;
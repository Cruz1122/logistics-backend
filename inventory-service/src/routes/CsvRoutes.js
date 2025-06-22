const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const upload = require("../middlewares/upload");

/**
 * @swagger
 * tags:
 *   name: CSV
 *   description: Upload CSV files for warehouses and products
 */

/**
 * @swagger
 * /csv/upload-warehouses:
 *   post:
 *     summary: Upload a CSV file with warehouses and managers
 *     tags: [CSV]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Warehouses uploaded successfully
 */

/**
 * @swagger
 * /csv/upload-product:
 *   post:
 *     summary: Upload a CSV file with product data
 *     tags: [CSV]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Products uploaded successfully
 */


const {
  uploadWarehousesWithManagers,
} = require("../controllers/CsvWarehouseController");
const { uploadProductCSV } = require("../controllers/CsvProductController");
router.post(
  "/upload-warehouses",
  authenticateJWT,
  authorize("Warehouse Management", "crear"),
  upload.single("file"),
  uploadWarehousesWithManagers
);
router.post(
  "/upload-product",
  authenticateJWT,
  authorize("Product Management", "crear"),
  upload.single("file"),
  uploadProductCSV
);

module.exports = router;

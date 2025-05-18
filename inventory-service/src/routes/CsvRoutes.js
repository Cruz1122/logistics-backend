const express = require("express");
const router = express.Router();
const { authenticateJWT, authorize } = require("../middlewares/Auth");
const upload = require("../middlewares/upload");
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

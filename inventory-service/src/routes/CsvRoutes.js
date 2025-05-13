const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const { uploadWarehousesWithManagers  } = require("../controllers/CsvWarehouseController");
const { uploadProductCSV } = require("../controllers/CsvProductController");
router.post("/upload-warehouses", upload.single("file"), uploadWarehousesWithManagers);
router.post("/upload-product", upload.single("file"), uploadProductCSV);

module.exports = router;


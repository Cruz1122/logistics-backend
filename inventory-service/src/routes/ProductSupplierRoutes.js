const express = require("express");
const router = express.Router();
const ProductSupplierController = require("../controllers/ProductSupplierController");

router.get("/", ProductSupplierController.getAll);
router.get("/:id", ProductSupplierController.getById);
router.post("/", ProductSupplierController.create);
router.put("/:id", ProductSupplierController.update);
router.delete("/:id", ProductSupplierController.remove);

module.exports = router;

const express = require("express");
const router = express.Router();
const SupplierController = require("../controllers/SupplierController");

router.get("/", SupplierController.getAll);
router.get("/:id", SupplierController.getById);
router.post("/", SupplierController.create);
router.put("/:id", SupplierController.update);
router.delete("/:id", SupplierController.remove);

module.exports = router;
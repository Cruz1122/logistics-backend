const express = require("express");
const router = express.Router();
const ProductWarehouseController = require("../controllers/ProductWarehouseController");

router.get("/", ProductWarehouseController.getAll);
router.get("/:id", ProductWarehouseController.getById);
router.post("/", ProductWarehouseController.create);
router.put("/:id", ProductWarehouseController.update);
router.delete("/:id", ProductWarehouseController.remove);

module.exports = router;
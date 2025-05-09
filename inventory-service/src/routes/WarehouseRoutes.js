const express = require("express");
const router = express.Router();
const WarehouseController = require("../controllers/WarehouseController");

router.get("/", WarehouseController.getAll);
router.get("/:id", WarehouseController.getById);
router.post("/", WarehouseController.create);
router.put("/:id", WarehouseController.update);
router.delete("/:id", WarehouseController.remove);

module.exports = router;
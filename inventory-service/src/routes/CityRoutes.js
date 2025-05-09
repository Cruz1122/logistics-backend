const express = require("express");
const router = express.Router();
const CityController = require("../controllers/CityController");

router.get("/", CityController.getAll);
router.get("/:id", CityController.getById);
router.post("/", CityController.create);
router.put("/:id", CityController.update);
router.delete("/:id", CityController.remove);

module.exports = router;
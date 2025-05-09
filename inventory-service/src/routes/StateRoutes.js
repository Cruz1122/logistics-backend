const express = require("express");
const router = express.Router();
const StateController = require("../controllers/StateController");

router.get("/", StateController.getAll);
router.get("/:id", StateController.getById);
router.post("/", StateController.create);
router.put("/:id", StateController.update);
router.delete("/:id", StateController.remove);

module.exports = router;
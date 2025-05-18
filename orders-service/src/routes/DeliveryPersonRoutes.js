const express = require("express");
const router = express.Router();
const {
  getAllDeliveryPersons,
  getDeliveryPersonById,
  createDeliveryPerson,
  updateDeliveryPerson,
  deleteDeliveryPerson,
} = require("../controllers/DeliveryPersonController");

router.get("/", getAllDeliveryPersons);
router.get("/:id", getDeliveryPersonById);
router.post("/", createDeliveryPerson);
router.put("/:id", updateDeliveryPerson);
router.delete("/:id", deleteDeliveryPerson);

module.exports = router;

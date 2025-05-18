const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
} = require("../controllers/OrderController");

router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  getAllOrderProducts,
  getOrderProductById,
  createOrderProduct,
  updateOrderProduct,
  deleteOrderProduct,
} = require("../controllers/OrderProductController");

router.get("/", getAllOrderProducts);
router.get("/:id", getOrderProductById);
router.post("/", createOrderProduct);
router.put("/:id", updateOrderProduct);
router.delete("/:id", deleteOrderProduct);

module.exports = router;

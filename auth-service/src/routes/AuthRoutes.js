const express = require("express");
const router = express.Router();
const { signUp, health } = require("../controllers/AuthController");

router.post("/signup", signUp);
router.get("/health", health);

module.exports = router;

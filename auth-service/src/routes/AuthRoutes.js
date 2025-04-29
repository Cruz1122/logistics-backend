const express = require("express");
const router = express.Router();
const { signUp, verifyEmail, health} = require("../controllers/AuthController");

router.post("/signup", signUp);
router.post("/verify-email", verifyEmail);
router.get("/health", health);

module.exports = router;

const express = require("express");
const router = express.Router();
const { signUp, verifyEmail, resendVerificationCode, login, verify2FaCode,health} = require("../controllers/AuthController");

router.post("/signup", signUp);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode );
router.post("/login", login);
router.post("/verify2FaCode", verify2FaCode);
router.get("/health", health);

module.exports = router;

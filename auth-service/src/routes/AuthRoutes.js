const express = require("express");
const router = express.Router();
const { signUp, verifyEmail, resendVerificationCode, signIn, verifyTwoFactor, requestPasswordReset,resetPassword, changePassword, health} = require("../controllers/AuthController");

router.post("/signup", signUp);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode );
router.post("/signin", signIn);
router.post("/verify-two-factor", verifyTwoFactor);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.patch("/change-password", changePassword);
router.get("/health", health);

module.exports = router;

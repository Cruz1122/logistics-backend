const express = require("express");
const router = express.Router();
const { signUp } = require("../controllers/AuthController");

// POST /auth/signup
router.post("/signup", signUp);

module.exports = router;

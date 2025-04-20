const express = require("express");
const router = express.Router();
const { signUp} = require("../controller/authcontroller");

router.post("/signup", signUp);
module.exports = router;
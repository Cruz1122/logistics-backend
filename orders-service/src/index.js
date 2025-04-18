const express = require("express");
const app = express();
app.get("/", (_, res) => res.send("Orders Service OK"));
app.listen(4004, () => console.log("Orders Service on port 4004"));

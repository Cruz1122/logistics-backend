const express = require("express");
const app = express();
app.get("/", (_, res) => res.send("Inventory Service OK"));
app.listen(4003, () => console.log("Inventory Service on port 4003"));

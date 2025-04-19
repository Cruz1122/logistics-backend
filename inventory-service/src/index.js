const express = require("express");
const app = express();
const PORT = process.env.INVENTORY_PORT || 4003;

app.get("/", (_, res) => res.send("Inventory Service OK"));
app.listen(PORT, () => console.log(`Inventory Service on port ${PORT}`));

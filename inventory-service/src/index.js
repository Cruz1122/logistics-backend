const express = require("express");
const app = express();
const PORT = process.env.PORT;

app.get("/", (_, res) => res.send("Inventory Service OK"));
app.listen(PORT, () => console.log(`Inventory Service on port ${PORT}`));

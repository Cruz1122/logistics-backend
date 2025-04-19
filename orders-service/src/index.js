const express = require("express");
const app = express();
const PORT = process.env.ORDERS_PORT;

app.get("/", (_, res) => res.send("Orders Service OK"));
app.listen(PORT, () => console.log(`Orders Service on port ${PORT}`));

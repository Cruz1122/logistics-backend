const express = require("express");
const app = express();
app.get("/", (_, res) => res.send("Geo Service OK"));
app.listen(4002, () => console.log("Auth Service on port 4002"));

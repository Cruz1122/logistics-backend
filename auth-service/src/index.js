const express = require("express");
const app = express();
app.get("/", (_, res) => res.send("Auth Service OK"));
app.listen(4001, () => console.log("Auth Service on port 4001"));

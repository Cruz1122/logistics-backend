const express = require("express");
const app = express();
app.get("/", (_, res) => res.send("Reports Service OK"));
app.listen(4005, () => console.log("Reports Service on port 4005"));

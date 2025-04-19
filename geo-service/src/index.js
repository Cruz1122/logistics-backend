const express = require("express");
const app = express();
const PORT = process.env.PORT;

app.get("/", (_, res) => res.send("Geo Service OK"));
app.listen(PORT, () => console.log(`Geo Service on port ${PORT}`));

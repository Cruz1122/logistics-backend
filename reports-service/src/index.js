const express = require("express");
const app = express();
const PORT = process.env.PORT;    

app.get("/", (_, res) => res.send("Reports Service OK"));
app.listen(PORT, () => console.log(`Reports Service on port ${PORT}`));

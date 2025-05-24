const express = require("express");
const mongoose = require("mongoose");
const locationsRouter = require("./routes/locations");
const app = express();
app.use(express.json());

mongoose
  .connect(process.env.GEO_DATABASE_URL)
  .then(() => console.log("Mongo connected successfully to Geo Service"))
  .catch((err) => console.error("Mongo connection error:", err));

const PORT = process.env.GEO_PORT || 4002;

app.get("/", (_, res) => res.send("Geo Service OK"));
app.use("/locations", locationsRouter);

app.listen(PORT, () => console.log(`Geo Service on port ${PORT}`));

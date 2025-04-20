const express = require("express");
const routes = require("./routes/AuthRoutes");

const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());

app.use(routes);

app.get("/", (_, res) => res.send("Auth Service is working!"));

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});

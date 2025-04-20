const express = require("express");
const routes = require("./routes/AuthRoutes");

const app = express();
const PORT = process.env.AUTH_PORT || 4001;

app.use(express.json());

app.use(routes);

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});

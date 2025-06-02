const express = require("express");
const app = express();
const PORT = process.env.REPORTS_PORT || 4005;    
const reportRoutes = require("./routes/reportRoutes");
const { swaggerSpec, swaggerUi } = require("./docs/swagger");

app.get("/", (_, res) => res.send("Reports Service OK"));
app.listen(PORT, () => console.log(`Reports Service on port ${PORT}`));

app.use(express.json());
app.use("/reports", reportRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Ajusta el origen según tu frontend
  },
});

mongoose
  .connect(process.env.GEO_DATABASE_URL)
  .then(() => console.log("Mongo connected successfully to Geo Service"))
  .catch((err) => console.error("Mongo connection error:", err));

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("subscribe", (data) => {
    const { deliveryPersonId } = data;
    if (deliveryPersonId) {
      socket.join(deliveryPersonId);
      console.log(`Socket ${socket.id} suscrito a ${deliveryPersonId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Exporta io para usar en rutas
app.set("io", io);

// Aquí monta tus rutas, por ejemplo:
const locationsRouter = require("./routes/locations");
app.use("/locations", locationsRouter);

const PORT = process.env.GEO_PORT || 4002;
server.listen(PORT, () => console.log(`Geo Service on port ${PORT}`));

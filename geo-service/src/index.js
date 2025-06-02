const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Setup Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
  },
  path: "/geo/socket.io", // Path for WebSocket
  transports: ["websocket"], // Only WebSocket
});

// Connect to MongoDB Database
mongoose
  .connect(process.env.GEO_DATABASE_URL)
  .then(() => console.log("Mongo connected successfully to Geo Service"))
  .catch((err) => console.error("Mongo connection error:", err));

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Listen for subscription requests
  // This allows delivery persons to subscribe to their own updates
  socket.on("subscribe", (data) => {
    const { deliveryPersonId } = data;
    if (deliveryPersonId) {
      socket.join(deliveryPersonId);
      console.log(`Socket ${socket.id} subscribed to ${deliveryPersonId}`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Export io for use in routes
app.set("io", io);

const locationsRouter = require("./routes/locations");
app.use("/locations", locationsRouter);

const PORT = process.env.GEO_PORT || 4002;
server.listen(PORT, () => console.log(`Geo Service on port ${PORT}`));

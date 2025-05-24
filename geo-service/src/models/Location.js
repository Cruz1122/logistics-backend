const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  deliveryPersonId: { type: String, required: true },
  orderId: { type: String, required: false },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  timestamp: { type: Date, default: Date.now },
});

// Índice 2dsphere para consultas geoespaciales
locationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Location", locationSchema);

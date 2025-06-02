const mongoose = require("mongoose");

// Define the schema for storing delivery person locations
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

// 2dsphere index for geospatial queries
locationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Location", locationSchema);

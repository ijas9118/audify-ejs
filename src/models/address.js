const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
    },
    landmark: {
      type: String,
    },
    zip: {
      type: String,
      required: [true, "ZIP Code is required"],
    },
    addressType: {
      type: String,
      enum: ["home", "work", "custom"],
      default: "custom",
    },
    customName: {
      type: String,
    },
    isDefault: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Address", addressSchema, "addresses");

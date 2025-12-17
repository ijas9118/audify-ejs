const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: {
      main: {
        type: String,
        required: true,
      },
      supports: {
        type: [String],
        validate: {
          validator: function (v) {
            return v.length === 2;
          },
          message: "Supports images must be exactly 2",
        },
        required: true,
      },
    },
    stock: {
      type: Number,
      required: true,
      max: 100,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      default: null,
    },
    popularity: {
      type: Number,
      default: 0,
    },
    isActive: { type: Boolean, default: true },
    isOutOfStock: {
      type: Boolean,
      default: false, 
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);

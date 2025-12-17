const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      require: true,
    },
    mobile: {
      type: Number,
      require: true,
      match: [/^\d{10}$/, "Please provide a valid 10-digit mobile number"],
    },
    alternateMobile: {
      type: Number,
      match: [/^\d{10}$/, "Please provide a valid 10-digit mobile number"],
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
    orderItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderItem",
        required: true,
      },
    ],
    paymentMethod: {
      type: String,
      enum: ["Razorpay", "Wallet", "COD"],
    },
    shippingCharge: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    discountApplied: {
      type: Number, // store the discount amount
      default: 0,
    },
    finalTotal: {
      type: Number, // total after discount
      required: true,
    },
    appliedCoupon: {
      type: String, // coupon code
    },
    status: {
      type: String,
      enum: ["Pending", "Processed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    dateOrdered: {
      type: Date,
      default: Date.now(),
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);

const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    minCartValue: {
      type: Number,
      default: 0,
    },
    maxDiscountValue: {
      type: Number,
    },
    validFrom: {
      type: Date,
      required: true, // New field to represent when the coupon becomes valid
    },
    validUntil: {
      type: Date,
      required: true, // New field to represent coupon expiration date
    },
    usageLimit: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    appliedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);

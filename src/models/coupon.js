const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0.01,
    },
    minCartValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountValue: {
      type: Number,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    perUserLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalUsageLimit: {
      type: Number,
      default: 0, // 0 for unlimited
      min: 0,
    },
    totalUsed: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    appliedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);

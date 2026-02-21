const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: String,

    mobile: {
      type: String,
      match: [/^\d{10}$/, 'Please provide a valid 10-digit mobile number'],
      required: true,
    },

    alternateMobile: {
      type: String,
      match: [/^\d{10}$/, 'Please provide a valid 10-digit mobile number'],
    },

    location: String,
    city: String,
    state: String,
    landmark: String,
    zip: String,

    orderItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderItem',
        required: true,
      },
    ],

    paymentMethod: {
      type: String,
      enum: ['Razorpay', 'Wallet', 'COD'],
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
      type: Number,
      default: 0,
    },

    finalTotal: {
      type: Number,
      required: true,
    },

    appliedCoupon: String,

    status: {
      type: String,
      enum: ['Pending', 'Processed', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },

    cancellationRequested: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

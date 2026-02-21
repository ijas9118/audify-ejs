const mongoose = require('mongoose');
const Counter = require('./counter');

const orderSchema = mongoose.Schema(
  {
    /**
     * Human-readable sequential order ID: ORD-00001, ORD-00002, …
     * Generated automatically on first save via pre-save hook.
     * Unique index enables fast look-ups and guarantees no collisions.
     */
    orderId: {
      type: String,
      unique: true,
      sparse: true, // allow null during migration of old documents
    },

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

/**
 * Auto-generate orderId before the first save.
 * Format: ORD-00001  (zero-padded to 5 digits, grows as needed)
 */
orderSchema.pre('save', async function preSave(next) {
  if (this.orderId) return next(); // already set, skip

  try {
    const seq = await Counter.getNextSequence('order');
    // Pad to at least 5 digits so early orders sort nicely as strings
    this.orderId = `ORD-${String(seq).padStart(5, '0')}`;
    return next();
  } catch (err) {
    return next(err);
  }
});

module.exports = mongoose.model('Order', orderSchema);

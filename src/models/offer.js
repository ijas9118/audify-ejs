const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['product', 'category', 'referral'],
    required: true
  },
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: function() { return this.type === 'product'; }
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: function() { return this.type === 'category'; }
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true
  },
  maxDiscountAmount: { 
    type: Number,
    default: null
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  minCartValue: {
    type: Number,
    default: 0
  },
  referralBonus: {
    referrer: { type: Number }, // e.g., ₹100 for referrer
    referee: { type: Number }   // e.g., ₹50 for referee
  },
  status: {
    type: String,
    enum: ['active', 'expired'],
    default: 'active'
  }
});

module.exports = mongoose.model('Offer', offerSchema);

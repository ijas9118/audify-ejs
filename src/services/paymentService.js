const Razorpay = require('razorpay');
const User = require('../models/userModel');
const Order = require('../models/order');

/**
 * Payment Gateway Integration
 */

/**
 * Create a Razorpay order
 * @param {string} orderId - Database order ID
 * @param {Object} options - Razorpay order options
 * @returns {Promise<Object>} Razorpay order and database order
 */
exports.createRazorpayOrder = async (orderId, options) => {
  const orderData = await Order.findById(orderId);

  if (!orderData) {
    throw new Error('Order not found');
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
  });

  const razorpayOrder = await razorpay.orders.create(options);

  if (!razorpayOrder) {
    throw new Error('Failed to create Razorpay order');
  }

  return {
    razorpayOrder,
    orderData,
  };
};

/**
 * COD Payment Validation
 */

/**
 * Validate if order is eligible for Cash on Delivery
 * @param {number} orderAmount - Order total amount
 * @returns {boolean} True if eligible, throws error otherwise
 */
exports.validateCODEligibility = (orderAmount) => {
  const COD_LIMIT = 1000;

  if (orderAmount > COD_LIMIT) {
    throw new Error(
      `Cash on Delivery is not available for orders above ₹${COD_LIMIT}`
    );
  }

  return true;
};

/**
 * Wallet Payment Processing
 */

/**
 * Process wallet payment for an order
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Updated order
 */
exports.processWalletPayment = async (userId, orderId) => {
  // Find user and order
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // Validate wallet balance
  if (user.walletBalance < order.finalTotal) {
    throw new Error(
      `Insufficient wallet balance. Required: ₹${order.finalTotal}, Available: ₹${user.walletBalance}`
    );
  }

  // Calculate updated balance
  const updatedWalletBalance = parseFloat(
    (user.walletBalance - order.finalTotal).toFixed(2)
  );

  // Update user wallet and add transaction
  await User.updateOne(
    { _id: userId },
    {
      $set: { walletBalance: updatedWalletBalance },
      $push: {
        walletTransactions: {
          transactionType: 'Debit',
          amount: order.finalTotal,
          description: `Payment for Order ID: ${orderId}`,
          date: new Date(),
        },
      },
    }
  );

  // Update order payment method and status
  order.paymentMethod = 'Wallet';
  order.status = 'Processed';
  await order.save();

  return order;
};

/**
 * Payment Method Confirmation
 */

/**
 * Confirm payment method for an order
 * @param {string} orderId - Order ID
 * @param {string} paymentMethod - Payment method (COD, Razorpay, Wallet)
 * @returns {Promise<Object>} Updated order
 */
exports.confirmPayment = async (orderId, paymentMethod) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  // Validate COD if selected
  if (paymentMethod === 'COD') {
    exports.validateCODEligibility(order.finalTotal);
  }

  // Update order
  order.paymentMethod = paymentMethod;
  order.status = 'Processed';
  await order.save();

  return order;
};

/**
 * Wallet Transaction Recording
 */

/**
 * Record a wallet transaction
 * @param {string} userId - User ID
 * @param {string} type - Transaction type (Credit/Debit)
 * @param {number} amount - Transaction amount
 * @param {string} description - Transaction description
 * @returns {Promise<Object>} Updated user
 */
exports.recordWalletTransaction = async (userId, type, amount, description) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const transaction = {
    transactionType: type,
    amount: parseFloat(amount.toFixed(2)),
    description,
    date: new Date(),
  };

  await User.updateOne(
    { _id: userId },
    {
      $push: { walletTransactions: transaction },
    }
  );

  return user;
};

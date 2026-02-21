const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/userModel');
const Cart = require('../models/cart');
const orderService = require('./orderService');
const authService = require('./authService');
const logger = require('../config/logger');

/**
 * Build Razorpay instance
 */
const getRazorpayInstance = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
  });

/**
 * Create a Razorpay order using the cart total (no DB order created yet).
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Razorpay order object
 */
exports.createRazorpayOrderFromCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) throw new Error('Cart not found');
  if (cart.items.length === 0)
    throw new Error('Cannot place order with empty cart');

  const amount = cart.finalTotal || cart.total;

  const razorpay = getRazorpayInstance();

  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `rcpt_${String(userId).slice(-8)}_${Date.now().toString(36)}`, // ≤40 chars
    });
  } catch (razorpayErr) {
    // Razorpay SDK throws plain objects, not Error instances.
    // Normalize to a proper Error so controllers can safely read .message
    const description =
      razorpayErr?.error?.description ||
      razorpayErr?.description ||
      razorpayErr?.message ||
      JSON.stringify(razorpayErr);
    throw new Error(`Razorpay order creation failed: ${description}`);
  }

  if (!razorpayOrder) throw new Error('Failed to create Razorpay order');

  return razorpayOrder;
};

/**
 * Verify Razorpay payment signature.
 * Throws if the signature is invalid.
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} razorpaySignature
 */
exports.verifyRazorpaySignature = (
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new Error('Invalid payment signature');
  }
};

/**
 * Verify Razorpay signature then create the DB order.
 * @param {string} userId
 * @param {Object} shippingDetails
 * @param {Object} paymentData - { razorpay_payment_id, razorpay_order_id, razorpay_signature }
 * @returns {Promise<Object>} Created order
 */
exports.verifyAndCreateRazorpayOrder = async (
  userId,
  shippingDetails,
  paymentData
) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    paymentData;

  // ✅ Verify signature BEFORE touching the DB
  exports.verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  // Capture cart items for email before cart is deleted
  const cart = await Cart.findOne({ user: userId });
  const cartItemsForEmail = cart
    ? cart.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))
    : [];

  // ✅ Create DB order only after signature verified
  const order = await orderService.createOrderFromCart(
    userId,
    shippingDetails,
    'Razorpay'
  );

  // Send confirmation email (non-blocking)
  try {
    const user = await User.findById(userId);
    if (user) {
      await authService.sendOrderConfirmationEmail({
        email: user.email,
        orderId: order._id,
        totalAmount: order.finalTotal,
        items: cartItemsForEmail,
        paymentMethod: 'Razorpay',
        shippingAddress: {
          name: order.name,
          location: order.location,
          city: order.city,
          state: order.state,
          zip: order.zip,
          mobile: order.mobile,
        },
      });
    }
  } catch (emailError) {
    logger.error('Failed to send order confirmation email:', emailError);
  }

  return order;
};

/**
 * COD Payment Validation
 */

/**
 * Validate if order total is eligible for Cash on Delivery
 * @param {number} orderAmount - Order total amount
 */
exports.validateCODEligibility = (orderAmount) => {
  const COD_LIMIT = Number(process.env.COD_LIMIT) || 1000;

  if (orderAmount > COD_LIMIT) {
    throw new Error(
      `Cash on Delivery is not available for orders above ₹${COD_LIMIT}`
    );
  }
};

/**
 * Confirm a COD order — validates limit then creates the DB order.
 * @param {string} userId
 * @param {Object} shippingDetails
 * @returns {Promise<Object>} Created order
 */
exports.confirmCODOrder = async (userId, shippingDetails) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) throw new Error('Cart not found');
  if (cart.items.length === 0)
    throw new Error('Cannot place order with empty cart');

  const amount = cart.finalTotal || cart.total;

  // Validate COD limit
  exports.validateCODEligibility(amount);

  // Capture cart items for email before cart is deleted
  const cartItemsForEmail = cart.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

  // Create the order
  const order = await orderService.createOrderFromCart(
    userId,
    shippingDetails,
    'COD'
  );

  // Send confirmation email (non-blocking)
  try {
    const user = await User.findById(userId);
    if (user) {
      await authService.sendOrderConfirmationEmail({
        email: user.email,
        orderId: order._id,
        totalAmount: order.finalTotal,
        items: cartItemsForEmail,
        paymentMethod: 'COD',
        shippingAddress: {
          name: order.name,
          location: order.location,
          city: order.city,
          state: order.state,
          zip: order.zip,
          mobile: order.mobile,
        },
      });
    }
  } catch (emailError) {
    logger.error('Failed to send order confirmation email:', emailError);
  }

  return order;
};

/**
 * Wallet Payment Processing
 */

/**
 * Process wallet payment — validate balance, create order, then deduct wallet.
 * @param {string} userId
 * @param {Object} shippingDetails
 * @returns {Promise<Object>} Created order
 */
exports.processWalletPayment = async (userId, shippingDetails) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error('Cart not found');
  if (cart.items.length === 0)
    throw new Error('Cannot place order with empty cart');

  const walletBalance = user.walletBalance || 0;
  const amount = cart.finalTotal || cart.total;

  // Validate wallet balance
  if (walletBalance < amount) {
    throw new Error(
      `Insufficient wallet balance. Required: ₹${amount}, Available: ₹${walletBalance}`
    );
  }

  // Capture cart items for email before cart is deleted
  const cartItemsForEmail = cart.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

  // Create the order first
  const order = await orderService.createOrderFromCart(
    userId,
    shippingDetails,
    'Wallet'
  );

  // Deduct from wallet AFTER order is confirmed
  const updatedWalletBalance = parseFloat(
    (walletBalance - order.finalTotal).toFixed(2)
  );

  await User.updateOne(
    { _id: userId },
    {
      $set: { walletBalance: updatedWalletBalance },
      $push: {
        walletTransactions: {
          transactionType: 'Debit',
          amount: order.finalTotal,
          description: `Payment for Order ID: ${order._id}`,
          date: new Date(),
        },
      },
    }
  );

  // Send confirmation email (non-blocking)
  try {
    await authService.sendOrderConfirmationEmail({
      email: user.email,
      orderId: order._id,
      totalAmount: order.finalTotal,
      items: cartItemsForEmail,
      paymentMethod: 'Wallet',
      shippingAddress: {
        name: order.name,
        location: order.location,
        city: order.city,
        state: order.state,
        zip: order.zip,
        mobile: order.mobile,
      },
    });
  } catch (emailError) {
    logger.error('Failed to send order confirmation email:', emailError);
  }

  return order;
};

/**
 * Wallet Transaction Recording (standalone utility)
 */
exports.recordWalletTransaction = async (userId, type, amount, description) => {
  const user = await User.findById(userId);

  if (!user) throw new Error('User not found');

  const transaction = {
    transactionType: type,
    amount: parseFloat(amount.toFixed(2)),
    description,
    date: new Date(),
  };

  await User.updateOne(
    { _id: userId },
    { $push: { walletTransactions: transaction } }
  );

  return user;
};

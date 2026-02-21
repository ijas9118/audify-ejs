const asyncHandler = require('express-async-handler');
const Address = require('../models/address');
const User = require('../models/userModel');
const cartService = require('../services/cartService');
const { StatusCodes } = require('../constants/constants');

/**
 * Get checkout page
 * Redirects to cart if cart is empty or does not exist.
 */
const getCheckoutPage = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const cart = await cartService.getCart(userId);

  // Guard: redirect if cart is empty
  if (!cart || cart.items.length === 0) {
    return res.redirect('/shop/cart');
  }

  const addresses = await Address.find({ user: userId });

  return res.render('layout', {
    title: 'Checkout',
    header: 'partials/login_header',
    viewName: 'users/checkout',
    activePage: 'Shop',
    isAdmin: false,
    cart,
    addresses,
  });
});

/**
 * Save shipping details to session then return redirect URL.
 * No DB writes happen here — order is created only after payment.
 */
const saveShippingDetails = asyncHandler(async (req, res) => {
  const {
    name,
    mobile,
    alternateMobile,
    location,
    city,
    state,
    landmark,
    zip,
  } = req.body;

  // Server-side validation
  if (!name || !name.trim()) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: 'Name is required' });
  }
  if (!mobile || !/^\d{10}$/.test(String(mobile).trim())) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Please provide a valid 10-digit mobile number',
    });
  }
  if (alternateMobile && !/^\d{10}$/.test(String(alternateMobile).trim())) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Please provide a valid 10-digit alternate mobile number',
    });
  }
  if (!location || !location.trim()) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: 'Location / Address is required' });
  }
  if (!city || !city.trim()) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: 'City is required' });
  }
  if (!state || !state.trim()) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: 'State is required' });
  }
  if (!zip || !zip.trim()) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: 'ZIP Code is required' });
  }

  // Persist shipping details in session (no DB write)
  req.session.pendingShipping = {
    name: name.trim(),
    mobile: String(mobile).trim(),
    alternateMobile: alternateMobile ? String(alternateMobile).trim() : '',
    location: location.trim(),
    city: city.trim(),
    state: state.trim(),
    landmark: landmark ? landmark.trim() : '',
    zip: zip.trim(),
  };

  return res
    .status(StatusCodes.OK)
    .json({ success: true, redirectUrl: '/checkout/payment' });
});

/**
 * Get payment selection page.
 * Requires valid session shipping details and a non-empty cart.
 */
const getPaymentPage = asyncHandler(async (req, res) => {
  const userId = req.session.user;

  // Guard: must have shipping details in session
  if (!req.session.pendingShipping) {
    return res.redirect('/checkout');
  }

  const cart = await cartService.getCart(userId);

  // Guard: cart must still exist and not be empty
  if (!cart || cart.items.length === 0) {
    return res.redirect('/shop/cart');
  }

  const user = await User.findById(userId).select('walletBalance');
  const walletBalance = user ? user.walletBalance || 0 : 0;

  return res.render('layout', {
    title: 'Payment',
    header: 'partials/login_header',
    viewName: 'users/payment',
    activePage: 'Shop',
    isAdmin: false,
    cart,
    walletBalance,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  });
});

module.exports = {
  getCheckoutPage,
  saveShippingDetails,
  getPaymentPage,
};

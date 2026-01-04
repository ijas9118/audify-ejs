const asyncHandler = require('express-async-handler');
const Address = require('../models/address');
const cartService = require('../services/cartService');

/**
 * Get checkout page
 */
const getCheckoutPage = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const cart = await cartService.getCart(userId);
  const addresses = await Address.find({ user: userId });

  res.render('layout', {
    title: 'Checkout',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/checkout',
    activePage: 'Shop',
    isAdmin: false,
    cart,
    addresses,
  });
});

module.exports = {
  getCheckoutPage,
};

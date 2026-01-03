const asyncHandler = require('express-async-handler');
const cartService = require('../services/cartService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const cart = await cartService.getCart(userId);

  res.render('layout', {
    title: 'Cart',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/cart',
    activePage: 'Shop',
    isAdmin: false,
    cart,
  });
});

exports.getCartItemID = asyncHandler(async (req, res) => {
  const userId = req.session.user;

  if (!userId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: RESPONSE_MESSAGES.USER_ID_REQUIRED });
  }

  try {
    const cart = await cartService.getCartWithProductDetails(userId);

    if (!cart) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: RESPONSE_MESSAGES.CART_NOT_FOUND });
    }

    // Extract product IDs and quantities
    const products = cart.items.map((item) => ({
      productId: item.productId._id.toString(),
      quantity: item.quantity,
      name: item.name,
    }));

    // Return product IDs and quantities as response
    res.json({ products });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: RESPONSE_MESSAGES.SERVER_ERROR });
  }
});

exports.addToCart = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const productId = req.params.id;
  try {
    await cartService.addToCart(userId, productId, 1);
    res
      .status(StatusCodes.OK)
      .json({ message: RESPONSE_MESSAGES.ITEM_ADDED_TO_CART });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: RESPONSE_MESSAGES.FAILED_TO_ADD_TO_CART });
  }
});

exports.updateCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user;

  const cart = await cartService.addToCart(userId, productId, quantity);

  res.json(cart);
});

exports.deleteItemFromCart = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user;

  try {
    const cart = await cartService.removeItemFromCart(userId, productId);
    res
      .status(StatusCodes.OK)
      .json({ message: RESPONSE_MESSAGES.ITEM_REMOVED_FROM_CART, cart });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: RESPONSE_MESSAGES.SERVER_ERROR });
  }
});

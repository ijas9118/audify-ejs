const asyncHandler = require('express-async-handler');
const cartService = require('../services/cartService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');
const logger = require('../config/logger');

const getCart = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const cart = await cartService.getCart(userId);

  res.render('layout', {
    title: 'Cart',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/cart',
    activePage: 'shop',
    isAdmin: false,
    cart,
  });
});

const getCartItemID = asyncHandler(async (req, res) => {
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

    const products = cart.items.map((item) => ({
      productId: item.productId._id.toString(),
      quantity: item.quantity,
      name: item.name,
    }));

    return res.json({ products });
  } catch (error) {
    logger.error('Error fetching cart items:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: RESPONSE_MESSAGES.SERVER_ERROR });
  }
});

const addToCart = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const productId = req.params.id;

  try {
    await cartService.addToCart(userId, productId, 1);
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: RESPONSE_MESSAGES.ITEM_ADDED_TO_CART });
  } catch (error) {
    logger.error(error);
    const isClientError =
      error.message.includes('not found') ||
      error.message.includes('not available') ||
      error.message.includes('out of stock') ||
      error.message.includes('Only') ||
      error.message.includes('Maximum');

    return res
      .status(
        isClientError
          ? StatusCodes.BAD_REQUEST
          : StatusCodes.INTERNAL_SERVER_ERROR
      )
      .json({
        success: false,
        message: error.message || RESPONSE_MESSAGES.FAILED_TO_ADD_TO_CART,
      });
  }
});

const updateCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user;

  try {
    const cart = await cartService.addToCart(userId, productId, quantity);
    return res.status(StatusCodes.OK).json({ success: true, cart });
  } catch (error) {
    logger.error('Error updating cart:', error);
    const isClientError =
      error.message.includes('not found') ||
      error.message.includes('not available') ||
      error.message.includes('out of stock') ||
      error.message.includes('Only') ||
      error.message.includes('Maximum') ||
      error.message.includes('Quantity');

    return res
      .status(
        isClientError
          ? StatusCodes.BAD_REQUEST
          : StatusCodes.INTERNAL_SERVER_ERROR
      )
      .json({
        success: false,
        message: error.message,
      });
  }
});

const deleteItemFromCart = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user;

  try {
    const cart = await cartService.removeItemFromCart(userId, productId);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.ITEM_REMOVED_FROM_CART,
      cart,
    });
  } catch (error) {
    logger.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: RESPONSE_MESSAGES.SERVER_ERROR,
    });
  }
});

module.exports = {
  getCart,
  getCartItemID,
  addToCart,
  updateCart,
  deleteItemFromCart,
};

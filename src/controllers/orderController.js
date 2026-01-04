const asyncHandler = require('express-async-handler');
const orderService = require('../services/orderService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

/**
 * Place order from cart
 */
const placeOrder = asyncHandler(async (req, res) => {
  const userId = req.session.user;
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

  try {
    const shippingDetails = {
      name,
      mobile,
      alternateMobile,
      location,
      city,
      state,
      landmark,
      zip,
    };

    const placedOrder = await orderService.createOrderFromCart(
      userId,
      shippingDetails
    );

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: RESPONSE_MESSAGES.ORDER_PLACED,
      orderId: placedOrder._id,
    });
  } catch (error) {
    if (error.message === 'Cart not found') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: RESPONSE_MESSAGES.CART_NOT_FOUND });
    }

    if (error.message === 'Cannot place order with empty cart') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: RESPONSE_MESSAGES.CART_EMPTY });
    }

    if (error.message === 'Product not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: RESPONSE_MESSAGES.PRODUCT_NOT_FOUND });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: RESPONSE_MESSAGES.ERROR_PLACING_ORDER,
      error: error.message,
    });
  }
});

/**
 * Get order success page
 */
const getOrderSuccessPage = asyncHandler(async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId, true);

    res.render('layout', {
      title: 'Order Success',
      header: req.session.user ? 'partials/login_header' : 'partials/header',
      viewName: 'users/orderSuccess',
      activePage: 'Order',
      isAdmin: false,
      order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);

    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
    }

    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(RESPONSE_MESSAGES.SERVER_ERROR);
  }
});

/**
 * Get order history
 */
const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const orders = await orderService.getUserOrders(userId);

  res.render('layout', {
    title: 'Order History',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/orderHistory',
    activePage: 'Order History',
    isAdmin: false,
    orders,
  });
});

/**
 * Get single order detail
 */
const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, true);

  res.render('layout', {
    title: 'Order Detail',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/orderDetail',
    activePage: 'Order',
    isAdmin: false,
    order,
  });
});

/**
 * Cancel order
 */
const cancelOrder = asyncHandler(async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user;

    const result = await orderService.cancelOrder(orderId, userId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      refunded: result.refunded,
      refundAmount: result.refundAmount,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.ORDER_NOT_FOUND });
    }

    if (error.message === 'Unauthorized to cancel this order') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === 'Order is already cancelled') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('cannot be cancelled')) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = {
  placeOrder,
  getOrderSuccessPage,
  getOrderHistory,
  getOrderDetail,
  cancelOrder,
};

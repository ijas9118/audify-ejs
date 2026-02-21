const asyncHandler = require('express-async-handler');
const orderService = require('../services/orderService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');
const logger = require('../config/logger');

/**
 * Get order success page.
 * Guards: order must exist and must have been paid (paymentMethod is set).
 */
const getOrderSuccessPage = asyncHandler(async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId, true);

    // Guard: if order is still pending/unpaid, don't show success page
    if (!order.paymentMethod) {
      return res.redirect('/checkout');
    }

    return res.render('layout', {
      title: 'Order Success',
      header: 'partials/login_header',
      viewName: 'users/orderSuccess',
      activePage: 'Order',
      isAdmin: false,
      order,
    });
  } catch (error) {
    logger.error('Error fetching order:', error);

    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
    }

    return res
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
    header: 'partials/login_header',
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
    header: 'partials/login_header',
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
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: RESPONSE_MESSAGES.ORDER_NOT_FOUND,
      });
    }

    if (error.message === 'Unauthorized to cancel this order') {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ success: false, message: error.message });
    }

    if (error.message === 'Order is already cancelled') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    if (error.message.includes('cannot be cancelled')) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
});

module.exports = {
  getOrderSuccessPage,
  getOrderHistory,
  getOrderDetail,
  cancelOrder,
};

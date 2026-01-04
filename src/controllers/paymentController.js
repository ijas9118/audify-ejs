const asyncHandler = require('express-async-handler');
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

/**
 * Create Razorpay order
 */
const createRazorpayOrder = asyncHandler(async (req, res) => {
  try {
    const { razorpayOrder, orderData } =
      await paymentService.createRazorpayOrder(req.params.id, req.body);

    res.status(StatusCodes.OK).json({ order: razorpayOrder, orderData });
  } catch (error) {
    console.error('Razorpay error:', error);

    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Error creating order');
  }
});

/**
 * Confirm payment method for order
 */
const confirmPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentMethod } = req.body;

  try {
    const order = await paymentService.confirmPayment(orderId, paymentMethod);

    res.status(StatusCodes.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.PAYMENT_CONFIRMED,
      order,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.ORDER_NOT_FOUND });
    }

    if (error.message.includes('Cash on Delivery is not available')) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }
});

/**
 * Process wallet payment
 */
const processWalletPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.session.user;

  try {
    const order = await paymentService.processWalletPayment(userId, orderId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Payment confirmed using wallet, order updated successfully',
      order,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.USER_NOT_FOUND });
    }

    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.ORDER_NOT_FOUND });
    }

    if (error.message.includes('Insufficient wallet balance')) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: RESPONSE_MESSAGES.INSUFFICIENT_WALLET_BALANCE,
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: `Error processing wallet payment: ${error.message}`,
      error: error.message,
    });
  }
});

/**
 * Get payment selection page
 */
const getPaymentPage = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  try {
    const { order, walletBalance } = await orderService.getOrderForPayment(
      orderId,
      req.session.user
    );

    res.render('layout', {
      title: 'Checkout',
      header: req.session.user ? 'partials/login_header' : 'partials/header',
      viewName: 'users/payment',
      activePage: 'Shop',
      isAdmin: false,
      order,
      walletBalance,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
    }

    if (error.message === 'User not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Error fetching order');
  }
});

module.exports = {
  createRazorpayOrder,
  confirmPayment,
  processWalletPayment,
  getPaymentPage,
};

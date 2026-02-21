const asyncHandler = require('express-async-handler');
const paymentService = require('../services/paymentService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');
const logger = require('../config/logger');

/**
 * Safely extract a human-readable message from any thrown value.
 * Razorpay SDK may throw plain objects like { statusCode, error: { description } }
 * instead of proper Error instances.
 */
const getErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  // Standard Error instance
  if (error.message) return error.message;
  // Razorpay SDK error shape: { error: { description } }
  if (error.error?.description) return error.error.description;
  // Razorpay error shape: { description }
  if (error.description) return error.description;
  return JSON.stringify(error);
};

/**
 * Helper: check session shipping details exist
 */
const requirePendingShipping = (req, res) => {
  if (!req.session.pendingShipping) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message:
        'Your session has expired. Please go back to checkout and re-enter your address.',
    });
    return false;
  }
  return true;
};

/**
 * Create Razorpay order from cart total (no DB order yet).
 * POST /checkout/razorpay/create
 */
const createRazorpayOrder = asyncHandler(async (req, res) => {
  if (!requirePendingShipping(req, res)) return;

  const userId = req.session.user;

  try {
    const razorpayOrder =
      await paymentService.createRazorpayOrderFromCart(userId);
    res.status(StatusCodes.OK).json({
      success: true,
      order: razorpayOrder,
      shipping: req.session.pendingShipping,
    });
  } catch (error) {
    const msg = getErrorMessage(error);
    logger.error('Razorpay order creation error:', error);

    if (msg === 'Cart not found' || msg?.includes('empty cart')) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: msg });
      return;
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to initiate payment. Please try again.',
    });
  }
});

/**
 * Verify Razorpay signature and create DB order.
 * POST /checkout/razorpay/verify
 */
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  if (!requirePendingShipping(req, res)) return;

  const userId = req.session.user;
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Missing payment verification data.',
    });
    return;
  }

  try {
    const order = await paymentService.verifyAndCreateRazorpayOrder(
      userId,
      req.session.pendingShipping,
      { razorpay_payment_id, razorpay_order_id, razorpay_signature }
    );

    // Clear shipping from session after successful order
    delete req.session.pendingShipping;

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Payment verified and order placed successfully.',
      orderId: order._id,
    });
  } catch (error) {
    const msg = getErrorMessage(error);
    logger.error('Razorpay verification error:', error);

    if (msg === 'Invalid payment signature') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          'Payment verification failed. If money was deducted, please contact support.',
      });
      return;
    }

    if (msg?.includes('Insufficient stock')) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: msg });
      return;
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message:
        'Order could not be placed after payment. Please contact support.',
    });
  }
});

/**
 * Confirm Cash on Delivery order and create DB order.
 * POST /checkout/cod
 */
const confirmCODPayment = asyncHandler(async (req, res) => {
  if (!requirePendingShipping(req, res)) return;

  const userId = req.session.user;

  try {
    const order = await paymentService.confirmCODOrder(
      userId,
      req.session.pendingShipping
    );

    // Clear shipping from session after successful order
    delete req.session.pendingShipping;

    res.status(StatusCodes.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.ORDER_PLACED,
      orderId: order._id,
    });
  } catch (error) {
    const msg = getErrorMessage(error);
    logger.error('COD order error:', error);

    if (msg?.includes('Cash on Delivery is not available')) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: msg });
      return;
    }

    if (msg === 'Cart not found' || msg?.includes('empty cart')) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: msg });
      return;
    }

    if (msg?.includes('Insufficient stock')) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: msg });
      return;
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to place order. Please try again.',
    });
  }
});

/**
 * Process Wallet payment and create DB order.
 * POST /checkout/wallet
 */
const processWalletPayment = asyncHandler(async (req, res) => {
  if (!requirePendingShipping(req, res)) return;

  const userId = req.session.user;

  try {
    const order = await paymentService.processWalletPayment(
      userId,
      req.session.pendingShipping
    );

    // Clear shipping from session after successful order
    delete req.session.pendingShipping;

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Payment confirmed using wallet. Order placed successfully.',
      orderId: order._id,
    });
  } catch (error) {
    const msg = getErrorMessage(error);
    logger.error('Wallet payment error:', error);

    if (msg === 'User not found') {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.USER_NOT_FOUND });
      return;
    }

    if (msg?.includes('Insufficient wallet balance')) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: RESPONSE_MESSAGES.INSUFFICIENT_WALLET_BALANCE,
      });
      return;
    }

    if (msg?.includes('Insufficient stock')) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: msg });
      return;
    }

    if (msg === 'Cart not found' || msg?.includes('empty cart')) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: msg });
      return;
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process wallet payment. Please try again.',
    });
  }
});

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  confirmCODPayment,
  processWalletPayment,
};

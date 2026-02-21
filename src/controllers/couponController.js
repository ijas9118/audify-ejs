const asyncHandler = require('express-async-handler');
const couponService = require('../services/couponService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');
const logger = require('../config/logger');

/**
 * Apply coupon to cart
 */
const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode, cartId } = req.body;
  const userId = req.authUser?._id || req.session.user;

  try {
    const result = await couponService.applyCouponToCart(
      cartId,
      couponCode,
      userId
    );

    return res.json({
      success: true,
      message: result.message,
      finalTotal: result.finalTotal,
      appliedCoupon: result.appliedCoupon,
    });
  } catch (error) {
    logger.error('Error applying coupon:', error);

    // Handle specific error types
    if (error.message === 'Cart not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.CART_NOT_FOUND });
    }

    if (error.message === 'Invalid or inactive coupon code') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: RESPONSE_MESSAGES.INVALID_COUPON });
    }

    if (error.message.includes('not valid at this time')) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    if (error.message === 'A coupon has already been applied to this cart') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: RESPONSE_MESSAGES.COUPON_ALREADY_APPLIED,
      });
    }

    if (error.message.includes('minimum cart subtotal')) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    if (error.message === 'Coupon usage limit reached') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'An error occurred while applying the coupon',
    });
  }
});

/**
 * Remove coupon from cart
 */
const removeCoupon = asyncHandler(async (req, res) => {
  const { cartId } = req.params;
  const userId = req.authUser?._id || req.session.user;

  try {
    const result = await couponService.removeCouponFromCart(cartId, userId);

    return res.json({
      success: true,
      message: result.message,
      finalTotal: result.finalTotal,
    });
  } catch (error) {
    logger.error('Error removing coupon:', error);

    if (error.message === 'Cart not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.CART_NOT_FOUND });
    }

    if (error.message === 'No coupon applied to this cart') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: RESPONSE_MESSAGES.NO_COUPON_APPLIED });
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'An error occurred while removing the coupon',
    });
  }
});

module.exports = {
  applyCoupon,
  removeCoupon,
};

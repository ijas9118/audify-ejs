const Coupon = require('../models/coupon');
const Cart = require('../models/cart');

/**
 * Coupon Validation
 */

/**
 * Validate a coupon code
 * @param {string} couponCode - Coupon code to validate
 * @returns {Promise<Object>} Validated coupon object
 */
exports.validateCoupon = async (couponCode) => {
  const coupon = await Coupon.findOne({ code: couponCode, isActive: true });

  if (!coupon) {
    throw new Error('Invalid or inactive coupon code');
  }

  // Check date validity
  const currentDate = new Date();
  if (currentDate < coupon.validFrom || currentDate > coupon.validUntil) {
    throw new Error(
      `Coupon ${couponCode} is not valid at this time. Valid from ${coupon.validFrom.toDateString()} to ${coupon.validUntil.toDateString()}`
    );
  }

  return coupon;
};

/**
 * Coupon Discount Calculation
 */

/**
 * Calculate discount amount based on coupon type
 * @param {Object} coupon - Coupon object
 * @param {number} cartTotal - Cart total amount
 * @returns {number} Calculated discount amount
 */
exports.calculateDiscount = (coupon, cartTotal) => {
  let discount = 0;

  if (coupon.discountType === 'percentage') {
    discount = parseFloat(
      ((coupon.discountValue / 100) * cartTotal).toFixed(2)
    );

    // Apply max discount cap if specified
    if (coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
      discount = coupon.maxDiscountValue;
    }
  } else if (coupon.discountType === 'fixed') {
    discount = coupon.discountValue;
  }

  return discount;
};

/**
 * Coupon Application
 */

/**
 * Apply coupon to cart with full validation
 * @param {string} cartId - Cart ID
 * @param {string} couponCode - Coupon code to apply
 * @returns {Promise<Object>} Updated cart details
 */
exports.applyCouponToCart = async (cartId, couponCode) => {
  // Fetch cart
  const cart = await Cart.findById(cartId);
  if (!cart) {
    throw new Error('Cart not found');
  }

  // Check if coupon already applied
  if (cart.appliedCoupon) {
    throw new Error('A coupon has already been applied to this cart');
  }

  // Validate coupon
  const coupon = await exports.validateCoupon(couponCode);

  // Calculate discount
  const discount = exports.calculateDiscount(coupon, cart.total);
  const finalTotal = cart.total - discount;

  // Update cart
  await Cart.updateOne(
    { _id: cartId },
    {
      $set: {
        appliedCoupon: coupon.code,
        discountApplied: discount,
        finalTotal,
      },
    }
  );

  return {
    success: true,
    message: `Coupon ${couponCode} applied successfully`,
    discount,
    finalTotal,
    appliedCoupon: coupon.code,
  };
};

/**
 * Remove coupon from cart and recalculate totals
 * @param {string} cartId - Cart ID
 * @returns {Promise<Object>} Updated cart details
 */
exports.removeCouponFromCart = async (cartId) => {
  const cart = await Cart.findById(cartId);

  if (!cart) {
    throw new Error('Cart not found');
  }

  if (!cart.appliedCoupon) {
    throw new Error('No coupon applied to this cart');
  }

  // Remove coupon and recalculate
  cart.appliedCoupon = null;
  cart.discountApplied = 0;

  // Use cart's calculateTotals method if available
  if (typeof cart.calculateTotals === 'function') {
    cart.calculateTotals();
  }

  // Update cart in database
  await Cart.updateOne(
    { _id: cartId },
    {
      $set: {
        appliedCoupon: null,
        discountApplied: 0,
        finalTotal: cart.finalTotal,
      },
    }
  );

  return {
    success: true,
    message: 'Coupon removed successfully',
    finalTotal: cart.finalTotal,
  };
};

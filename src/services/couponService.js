const Coupon = require('../models/coupon');
const Cart = require('../models/cart');
const { getPaginationMeta } = require('../utils/pagination');
const { escapeRegex } = require('../utils/regex');

const MIN_LIMIT = 5;
const MAX_LIMIT = 15;

const buildSearchFilter = (search) => {
  const query = (search || '').trim();

  if (!query) {
    return {};
  }

  return {
    $or: [
      { code: { $regex: escapeRegex(query), $options: 'i' } },
      { discountType: { $regex: escapeRegex(query), $options: 'i' } },
    ],
  };
};

exports.getPaginatedCoupons = async ({ page, limit, search }) => {
  const filter = buildSearchFilter(search);
  const total = await Coupon.countDocuments(filter);
  const pagination = getPaginationMeta({
    total,
    page,
    limit,
    minLimit: MIN_LIMIT,
    maxLimit: MAX_LIMIT,
  });

  const coupons = await Coupon.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  return {
    coupons,
    pagination,
    search: (search || '').trim(),
  };
};

exports.createCoupon = async (couponData) => {
  const {
    code,
    discountType,
    discountValue,
    maxDiscountValue,
    minCartValue,
    validFrom,
    validUntil,
    usageLimit,
    isActive,
  } = couponData;

  if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
    throw new Error('Missing required fields');
  }

  const existingCoupon = await Coupon.findOne({ code });
  if (existingCoupon) {
    throw new Error('Coupon already exists');
  }

  const newCoupon = new Coupon({
    code,
    discountType,
    discountValue,
    maxDiscountValue,
    minCartValue: minCartValue || 0,
    validFrom,
    validUntil,
    usageLimit: usageLimit || 1,
    isActive: isActive !== undefined ? isActive : true,
  });

  await newCoupon.save();
  return newCoupon;
};

exports.updateCouponById = async (couponId, couponData) => {
  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throw new Error('Coupon not found');
  }

  const {
    code,
    discountType,
    discountValue,
    maxDiscountValue,
    minCartValue,
    validFrom,
    validUntil,
    usageLimit,
    isActive,
  } = couponData;

  coupon.code = code || coupon.code;
  coupon.discountType = discountType || coupon.discountType;
  coupon.discountValue = discountValue || coupon.discountValue;
  coupon.maxDiscountValue = maxDiscountValue;
  coupon.minCartValue = minCartValue;
  coupon.validFrom = validFrom || coupon.validFrom;
  coupon.validUntil = validUntil || coupon.validUntil;
  coupon.usageLimit = usageLimit || coupon.usageLimit;
  coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;

  await coupon.save();
  return coupon;
};

exports.deleteCouponById = async (couponId) => {
  const coupon = await Coupon.findByIdAndDelete(couponId);

  if (!coupon) {
    throw new Error('Coupon not found');
  }

  return coupon;
};

exports.toggleCouponStatusById = async (couponId) => {
  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throw new Error('Coupon not found');
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  return coupon;
};

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

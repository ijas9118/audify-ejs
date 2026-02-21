const Coupon = require('../models/coupon');
const Cart = require('../models/cart');
const Order = require('../models/order');
const { getPaginationMeta } = require('../utils/pagination');
const { escapeRegex } = require('../utils/regex');

const MIN_LIMIT = 5;
const MAX_LIMIT = 15;
const normalizeCouponCode = (code) => (code || '').trim().toUpperCase();

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

exports.getCouponById = async (couponId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new Error('Coupon not found');
  }
  return coupon;
};

exports.getCouponUsageDetailsById = async (couponId) => {
  const coupon = await exports.getCouponById(couponId);

  const orders = await Order.find({
    appliedCoupon: coupon.code,
    status: { $ne: 'Cancelled' },
  })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .select(
      '_id orderId user status createdAt totalAmount discountApplied finalTotal'
    );

  const usedCount = orders.length;
  const uniqueCustomerIds = new Set(
    orders.map((order) => order.user?._id?.toString()).filter(Boolean)
  );
  const uniqueCustomersCount = uniqueCustomerIds.size;
  const remainingUsage =
    coupon.totalUsageLimit > 0
      ? Math.max(coupon.totalUsageLimit - usedCount, 0)
      : null;

  const usageEntries = orders.map((order) => ({
    orderId: order.orderId || order._id,
    createdAt: order.createdAt,
    status: order.status,
    discountApplied: order.discountApplied,
    totalAmount: order.totalAmount,
    finalTotal: order.finalTotal,
    customer: order.user
      ? {
          id: order.user._id,
          firstName: order.user.firstName,
          lastName: order.user.lastName,
          email: order.user.email,
        }
      : null,
  }));

  return {
    coupon,
    usage: {
      usedCount,
      uniqueCustomersCount,
      remainingUsage,
      isUnlimited: coupon.totalUsageLimit === 0,
      entries: usageEntries,
    },
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
    perUserLimit,
    totalUsageLimit,
    isActive,
  } = couponData;

  const normalizedCode = normalizeCouponCode(code);

  if (
    !normalizedCode ||
    !discountType ||
    discountValue === undefined ||
    !validFrom ||
    !validUntil
  ) {
    throw new Error('Missing required fields');
  }

  if (discountType === 'percentage' && discountValue > 100) {
    throw new Error('Percentage discount cannot exceed 100%');
  }

  const existingCoupon = await Coupon.findOne({ code: normalizedCode });
  if (existingCoupon) {
    throw new Error('Coupon already exists');
  }

  const startDate = new Date(validFrom);
  const endDate = new Date(validUntil);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid coupon date range');
  }
  if (endDate < startDate) {
    throw new Error('Valid until date must be after valid from date');
  }

  const newCoupon = new Coupon({
    code: normalizedCode,
    discountType,
    discountValue,
    maxDiscountValue: maxDiscountValue || undefined,
    minCartValue: minCartValue || 0,
    validFrom: startDate,
    validUntil: endDate,
    perUserLimit: perUserLimit || 1,
    totalUsageLimit: totalUsageLimit || 0,
    isActive: isActive !== undefined ? isActive : true,
  });

  try {
    await newCoupon.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Coupon already exists');
    }
    throw error;
  }
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
    perUserLimit,
    totalUsageLimit,
    isActive,
  } = couponData;

  if (code !== undefined) {
    const normalizedCode = normalizeCouponCode(code);
    const existingCoupon = await Coupon.findOne({
      code: normalizedCode,
      _id: { $ne: couponId },
    });
    if (existingCoupon) {
      throw new Error('Coupon already exists');
    }
    coupon.code = normalizedCode;
  }
  coupon.discountType =
    discountType !== undefined ? discountType : coupon.discountType;
  coupon.discountValue =
    discountValue !== undefined ? discountValue : coupon.discountValue;

  if (coupon.discountType === 'percentage' && coupon.discountValue > 100) {
    throw new Error('Percentage discount cannot exceed 100%');
  }
  coupon.maxDiscountValue =
    maxDiscountValue !== undefined ? maxDiscountValue : coupon.maxDiscountValue;
  coupon.minCartValue =
    minCartValue !== undefined ? minCartValue : coupon.minCartValue;
  coupon.validFrom = validFrom !== undefined ? validFrom : coupon.validFrom;
  coupon.validUntil = validUntil !== undefined ? validUntil : coupon.validUntil;
  coupon.perUserLimit =
    perUserLimit !== undefined ? perUserLimit : coupon.perUserLimit;
  coupon.totalUsageLimit =
    totalUsageLimit !== undefined ? totalUsageLimit : coupon.totalUsageLimit;
  coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;

  if (coupon.validUntil < coupon.validFrom) {
    throw new Error('Valid until date must be after valid from date');
  }

  try {
    await coupon.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Coupon already exists');
    }
    throw error;
  }
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
exports.validateCoupon = async (couponCode, userId = null) => {
  const normalizedCode = normalizeCouponCode(couponCode);
  const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });

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

  // Check global usage limit
  if (coupon.totalUsageLimit > 0) {
    const totalUsageCount = await Order.countDocuments({
      appliedCoupon: coupon.code,
      status: { $ne: 'Cancelled' },
    });
    if (totalUsageCount >= coupon.totalUsageLimit) {
      throw new Error('Coupon usage limit reached');
    }
  }

  // Check per-user usage limit if userId provided
  if (userId && coupon.perUserLimit > 0) {
    const perUserUsageCount = await Order.countDocuments({
      user: userId,
      appliedCoupon: coupon.code,
      status: { $ne: 'Cancelled' },
    });
    if (perUserUsageCount >= coupon.perUserLimit) {
      throw new Error('Coupon usage limit reached');
    }
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

  return Math.min(discount, cartTotal);
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
exports.applyCouponToCart = async (cartId, couponCode, userId) => {
  // Fetch cart
  const cart = await Cart.findOne({ _id: cartId, user: userId });
  if (!cart) {
    throw new Error('Cart not found');
  }

  // Check if coupon already applied
  if (cart.appliedCoupon) {
    throw new Error('A coupon has already been applied to this cart');
  }

  // Validate coupon (including per-user limit)
  const coupon = await exports.validateCoupon(couponCode, userId);

  const cartSubtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
  if (cartSubtotal < coupon.minCartValue) {
    throw new Error(
      `Coupon requires a minimum cart subtotal of ${coupon.minCartValue}`
    );
  }

  // Calculate discount on subtotal (standard practice)
  const discount = exports.calculateDiscount(coupon, cartSubtotal);
  const finalTotal = parseFloat((cart.total - discount).toFixed(2));

  // Update cart
  await Cart.updateOne(
    { _id: cartId, user: userId },
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
exports.removeCouponFromCart = async (cartId, userId) => {
  const cart = await Cart.findOne({ _id: cartId, user: userId });

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
    { _id: cartId, user: userId },
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

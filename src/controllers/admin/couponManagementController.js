const asyncHandler = require('express-async-handler');
const Coupon = require('../../models/coupon');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  Coupon Management Controllers
// ============================

// Render Coupon Management Page
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find();
  res.render('layout', {
    title: 'Coupon Management',
    viewName: 'admin/couponManagement',
    activePage: 'coupon',
    isAdmin: true,
    coupons,
  });
});

const addCoupon = asyncHandler(async (req, res) => {
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
  } = req.body;

  // Validate required fields
  if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: RESPONSE_MESSAGES.MISSING_REQUIRED_FIELDS,
    });
  }

  const existingCoupon = await Coupon.findOne({ code });

  if (existingCoupon) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: RESPONSE_MESSAGES.COUPON_EXISTS,
    });
  }

  // Create a new coupon document
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

  // Save the coupon to the database
  await newCoupon.save();

  // Send a success response
  res
    .status(StatusCodes.CREATED)
    .json({ success: true, message: RESPONSE_MESSAGES.COUPON_ADDED });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
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
  } = req.body;

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: RESPONSE_MESSAGES.COUPON_NOT_FOUND });
  }

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

  res.status(StatusCodes.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.COUPON_UPDATED,
    coupon,
  });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const couponId = req.params.id;

  const result = await Coupon.findByIdAndDelete(couponId);

  if (!result) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: RESPONSE_MESSAGES.COUPON_NOT_FOUND });
  }

  res
    .status(StatusCodes.OK)
    .json({ message: RESPONSE_MESSAGES.COUPON_DELETED });
});

const toggleCouponStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ success: false, message: RESPONSE_MESSAGES.COUPON_NOT_FOUND });
  }

  coupon.isActive = !coupon.isActive;

  await coupon.save();

  res.json({
    success: true,
    message: RESPONSE_MESSAGES.COUPON_STATUS_UPDATED,
    coupon,
  });
});

module.exports = {
  getCoupons,
  addCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
};

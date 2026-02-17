const asyncHandler = require('express-async-handler');
const couponService = require('../../services/couponService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  Coupon Management Controllers
// ============================

// Render Coupon Management Page
const getCoupons = asyncHandler(async (req, res) => {
  const { coupons, pagination, search } =
    await couponService.getPaginatedCoupons({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    });

  res.render('layout', {
    title: 'Coupon Management',
    viewName: 'admin/couponManagement',
    activePage: 'coupon',
    isAdmin: true,
    coupons,
    pagination,
    search,
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

  try {
    await couponService.createCoupon({
      code,
      discountType,
      discountValue,
      maxDiscountValue,
      minCartValue,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
    });

    return res
      .status(StatusCodes.CREATED)
      .json({ success: true, message: RESPONSE_MESSAGES.COUPON_ADDED });
  } catch (error) {
    if (error.message === 'Missing required fields') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: RESPONSE_MESSAGES.MISSING_REQUIRED_FIELDS,
      });
    }

    if (error.message === 'Coupon already exists') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: RESPONSE_MESSAGES.COUPON_EXISTS,
      });
    }

    throw error;
  }
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

  let coupon;

  try {
    coupon = await couponService.updateCouponById(id, {
      code,
      discountType,
      discountValue,
      maxDiscountValue,
      minCartValue,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
    });
  } catch (error) {
    if (error.message === 'Coupon not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: RESPONSE_MESSAGES.COUPON_NOT_FOUND });
    }

    throw error;
  }

  return res.status(StatusCodes.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.COUPON_UPDATED,
    coupon,
  });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const couponId = req.params.id;

  try {
    await couponService.deleteCouponById(couponId);
  } catch (error) {
    if (error.message === 'Coupon not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: RESPONSE_MESSAGES.COUPON_NOT_FOUND });
    }

    throw error;
  }

  return res
    .status(StatusCodes.OK)
    .json({ message: RESPONSE_MESSAGES.COUPON_DELETED });
});

const toggleCouponStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let coupon;

  try {
    coupon = await couponService.toggleCouponStatusById(id);
  } catch (error) {
    if (error.message === 'Coupon not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.COUPON_NOT_FOUND });
    }

    throw error;
  }

  return res.json({
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

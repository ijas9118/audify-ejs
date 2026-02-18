const asyncHandler = require('express-async-handler');
const couponService = require('../../services/couponService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

const expectsJsonResponse = (req) =>
  req.xhr ||
  req.is('application/json') ||
  req.get('content-type')?.includes('application/json') ||
  req.get('accept')?.includes('application/json');

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

    if (
      error.message === 'Invalid coupon date range' ||
      error.message === 'Valid until date must be after valid from date'
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }
});

const getEditCouponPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let coupon;

  try {
    coupon = await couponService.getCouponById(id);
  } catch (error) {
    if (error.message === 'Coupon not found') {
      return res.status(StatusCodes.NOT_FOUND).render('layout', {
        title: RESPONSE_MESSAGES.COUPON_NOT_FOUND,
        viewName: '404',
        isAdmin: true,
        activePage: 'coupon',
      });
    }
    throw error;
  }

  return res.render('layout', {
    title: `Edit Coupon - ${coupon.code}`,
    viewName: 'admin/editCoupon',
    activePage: 'coupon',
    isAdmin: true,
    coupon,
    errors: {},
    formData: null,
    formError: null,
  });
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
  const wantsJson = expectsJsonResponse(req);

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
      if (!wantsJson) {
        return res.status(StatusCodes.NOT_FOUND).render('layout', {
          title: RESPONSE_MESSAGES.COUPON_NOT_FOUND,
          viewName: '404',
          isAdmin: true,
          activePage: 'coupon',
        });
      }
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: RESPONSE_MESSAGES.COUPON_NOT_FOUND });
    }

    if (error.message === 'Coupon already exists') {
      if (!wantsJson) {
        return res.status(StatusCodes.BAD_REQUEST).render('layout', {
          title: `Edit Coupon - ${code || 'Coupon'}`,
          viewName: 'admin/editCoupon',
          activePage: 'coupon',
          isAdmin: true,
          coupon: { _id: id },
          errors: {},
          formData: req.body,
          formError: RESPONSE_MESSAGES.COUPON_EXISTS,
        });
      }
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: RESPONSE_MESSAGES.COUPON_EXISTS });
    }

    if (error.message === 'Valid until date must be after valid from date') {
      if (!wantsJson) {
        return res.status(StatusCodes.BAD_REQUEST).render('layout', {
          title: `Edit Coupon - ${code || 'Coupon'}`,
          viewName: 'admin/editCoupon',
          activePage: 'coupon',
          isAdmin: true,
          coupon: { _id: id },
          errors: {},
          formData: req.body,
          formError: error.message,
        });
      }
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }

  if (!wantsJson) {
    return res.redirect('/admin/coupons');
  }

  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: RESPONSE_MESSAGES.COUPON_UPDATED, coupon });
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
  getEditCouponPage,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
};

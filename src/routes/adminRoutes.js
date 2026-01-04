const express = require('express');

const router = express.Router();
const adminAuth = require('../middleware/adminAuth');

// Import new domain-specific controllers
const adminAuthController = require('../controllers/admin/adminAuthController');
const userManagementController = require('../controllers/admin/userManagementController');
const orderManagementController = require('../controllers/admin/orderManagementController');
const couponManagementController = require('../controllers/admin/couponManagementController');
const offerManagementController = require('../controllers/admin/offerManagementController');
const salesReportController = require('../controllers/admin/salesReportController');
const {
  couponValidation,
  validate,
} = require('../middleware/validators/adminValidator');

// ============================
// Admin Authentication Routes
// ============================
router.get('/login', adminAuthController.getAdminLogin);
router.post('/login', adminAuthController.loginAdmin);
router.post('/logout', adminAuth, adminAuthController.logoutAdmin);

// ============================
// Admin Dashboard Routes
// ============================
router.get('/', adminAuth, adminAuthController.getAdminHome);
router.get('/sales-data', adminAuth, salesReportController.getSalesData);
router.get('/best-sellers', adminAuth, salesReportController.getBestSellers);

// ============================
// User Management Routes
// ============================
router.get('/users', adminAuth, userManagementController.getUsers);
router.get(
  '/users/toggle/:id',
  adminAuth,
  userManagementController.toggleUserStatus
);

// ============================
// Order Management Routes
// ============================
router.get('/orders', adminAuth, orderManagementController.getOrders);
router.post(
  '/orders/update/:id',
  adminAuth,
  orderManagementController.updateOrderStatus
);
router.get('/orders/:id', adminAuth, orderManagementController.viewOrder);
router.post('/sales-report', adminAuth, salesReportController.getSalesReport);

// ============================
// Coupon Management Routes
// ============================
router.get('/coupons', adminAuth, couponManagementController.getCoupons);
router.post(
  '/coupons',
  adminAuth,
  couponValidation,
  validate,
  couponManagementController.addCoupon
);
router.post(
  '/coupons/edit/:id',
  adminAuth,
  couponValidation,
  validate,
  couponManagementController.updateCoupon
);
router.delete(
  '/coupons/:id',
  adminAuth,
  couponManagementController.deleteCoupon
);
router.get(
  '/coupons/toggle/:id',
  adminAuth,
  couponManagementController.toggleCouponStatus
);

// ============================
// Offer Management Routes
// ============================
router.get('/offers', adminAuth, offerManagementController.getOffers);
router.post('/offers', adminAuth, offerManagementController.addOffer);
router.post(
  '/offers/edit/:id',
  adminAuth,
  offerManagementController.updateOffer
);
router.delete('/offers/:id', adminAuth, offerManagementController.deleteOffer);
router.put(
  '/offers/toggle/:id',
  adminAuth,
  offerManagementController.toggleOfferStatus
);
router.get(
  '/offer-categories',
  adminAuth,
  offerManagementController.getOfferCategories
);
router.get(
  '/offer-products',
  adminAuth,
  offerManagementController.getOfferProducts
);

// ============================
// Deal Management Routes
// ============================
router.get('/deals', adminAuth, offerManagementController.getDeals);

module.exports = router;

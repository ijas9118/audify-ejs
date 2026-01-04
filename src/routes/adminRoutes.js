const express = require('express');

const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// Admininistrator Login
router.get('/login', adminController.getAdminLogin);
router.post('/login', adminController.loginAdmin);
router.post('/logout', adminAuth, adminController.logoutAdmin);

// Admin Dashboard
router.get('/', adminAuth, adminController.getAdminHome);
router.get('/sales-data', adminAuth, adminController.getSalesData);
router.get('/best-sellers', adminAuth, adminController.getBestSellers);

// User Management
router.get('/users', adminAuth, adminController.getUsers);
router.get('/users/toggle/:id', adminAuth, adminController.toggleUserStatus);

// Order Management
router.get('/orders', adminAuth, adminController.getOrders);
router.post('/orders/update/:id', adminAuth, adminController.updateOrderStatus);
router.get('/orders/:id', adminAuth, adminController.viewOrder);
router.post('/sales-report', adminAuth, adminController.getSalesReport);

// Coupon Management
router.get('/coupons', adminAuth, adminController.getCoupons);
router.post('/coupons', adminAuth, adminController.addCoupon);
router.post('/coupons/edit/:id', adminAuth, adminController.updateCoupon);
router.delete('/coupons/:id', adminAuth, adminController.deleteCoupon);
router.post(
  '/coupons/toggle/:id',
  adminAuth,
  adminController.toggleCouponStatus
);

// Offer Management
router.get('/offers', adminAuth, adminController.getOffers);
router.post('/offers', adminAuth, adminController.addOffer);
router.post('/offers/edit/:id', adminAuth, adminController.updateOffer);
router.delete('/offers/:id', adminAuth, adminController.deleteOffer);
router.post('/offers/toggle/:id', adminAuth, adminController.toggleOfferStatus);
router.get('/offer-categories', adminAuth, adminController.getOfferCategories);
router.get('/offer-products', adminAuth, adminController.getOfferProducts);

// Deal  Management
router.get('/deals', adminAuth, adminController.getDeals);

module.exports = router;

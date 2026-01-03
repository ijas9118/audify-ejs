const express = require('express');

const router = express.Router();
const adminAuth = require('../middleware/adminAuth');

const {
  loginAdmin,
  logoutAdmin,
  getUsers,
  getOrders,
  getCoupons,
  getOffers,
  getDeals,
  getAdminHome,
  getAdminLogin,
  toggleUserStatus,
  updateOrderStatus,
  viewOrder,
  addOffer,
  updateOffer,
  deleteOffer,
  addCoupon,
  updateCoupon,
  deleteCoupon,
  getSalesReport,
  getSalesData,
  getBestSellers,
  toggleCouponStatus,
  toggleOfferStatus,
  getOfferCategories,
  getOfferProducts,
} = require('../controllers/adminController');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');

// Admin Home Route
router.get('/', adminAuth, getAdminHome);
router.post('/sales-report', adminAuth, getSalesReport);
router.get('/sales-data', adminAuth, getSalesData);
router.get('/best-sellers', getBestSellers);

// Admin Authentication Routes
// Admin Login Route
router.route('/login').get(getAdminLogin).post(loginAdmin);
// Admin Logout Route
router.post('/logout', adminAuth, logoutAdmin);

// User Management Routes
router.get('/users', adminAuth, getUsers);

// User status toggle
router.post('/users/toggle-status/:id', adminAuth, toggleUserStatus);

// Product Management Route
router.use('/products', productRoutes);

// Order Management Route
router.get('/orders', adminAuth, getOrders);
router.post('/orders/update-status/:id', adminAuth, updateOrderStatus);
router.get('/orders/view/:id', adminAuth, viewOrder);

// Category Management Route
router.use('/category', categoryRoutes);

// Coupon Management Route
router.get('/coupon', adminAuth, getCoupons);

router.post('/coupon/add', adminAuth, addCoupon);

router.post('/coupon/update/:id', adminAuth, updateCoupon);

router.delete('/coupon/delete/:id', adminAuth, deleteCoupon);

router.put('/coupon/toggle-status/:id', adminAuth, toggleCouponStatus);

// Offer Management Route
router.get('/offer', adminAuth, getOffers);
router.post('/offer', adminAuth, addOffer);
router.get('/offer/categories', getOfferCategories);
router.get('/offer/products', getOfferProducts);

router.post('/offer/update/:id', adminAuth, updateOffer);

router.delete('/offer/delete/:id', adminAuth, deleteOffer);

router.put('/offer/toggle/:id', adminAuth, toggleOfferStatus);

// Deal Management Route
router.get('/deal', adminAuth, getDeals);

module.exports = router;

const express = require('express');

const router = express.Router();
const userAuth = require('../middleware/userAuth');
const checkoutController = require('../controllers/checkoutController');
const couponController = require('../controllers/couponController');
const paymentController = require('../controllers/paymentController');
const orderController = require('../controllers/orderController');

// Checkout page
router.get('/', userAuth, checkoutController.getCheckoutPage);

// Payment operations
router.post('/', userAuth, paymentController.confirmPayment);
router.post('/wallet', userAuth, paymentController.processWalletPayment);
router.post('/order/:id', paymentController.createRazorpayOrder);
router.get('/payment/:orderId', userAuth, paymentController.getPaymentPage);

// Order operations
router.post('/place-order', userAuth, orderController.placeOrder);
router.get(
  '/order-success/:orderId',
  userAuth,
  orderController.getOrderSuccessPage
);

// Coupon operations
router.post('/apply-coupons', userAuth, couponController.applyCoupon);
router.get('/remove-coupon/:cartId', userAuth, couponController.removeCoupon);

module.exports = router;

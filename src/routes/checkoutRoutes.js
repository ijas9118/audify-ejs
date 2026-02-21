const express = require('express');

const router = express.Router();
const userAuth = require('../middleware/userAuth');
const checkoutController = require('../controllers/checkoutController');
const couponController = require('../controllers/couponController');
const paymentController = require('../controllers/paymentController');
const orderController = require('../controllers/orderController');

// ─── Checkout Page ────────────────────────────────────────────────────────────
// GET  /checkout        → show checkout form (address + cart summary)
router.get('/', userAuth, checkoutController.getCheckoutPage);

// POST /checkout/save-address → validate address, save to session, return redirect URL
router.post('/save-address', userAuth, checkoutController.saveShippingDetails);

// ─── Payment Page ─────────────────────────────────────────────────────────────
// GET  /checkout/payment  → show payment method selection (requires session shipping)
router.get('/payment', userAuth, checkoutController.getPaymentPage);

// ─── Payment Actions ──────────────────────────────────────────────────────────
// POST /checkout/cod               → validate COD limit, create order
router.post('/cod', userAuth, paymentController.confirmCODPayment);

// POST /checkout/wallet            → validate wallet balance, create order
router.post('/wallet', userAuth, paymentController.processWalletPayment);

// POST /checkout/razorpay/create   → create Razorpay order from cart (no DB order)
router.post(
  '/razorpay/create',
  userAuth,
  paymentController.createRazorpayOrder
);

// POST /checkout/razorpay/verify   → verify signature, create DB order
router.post(
  '/razorpay/verify',
  userAuth,
  paymentController.verifyRazorpayPayment
);

// ─── Order Success ────────────────────────────────────────────────────────────
// GET  /checkout/order-success/:orderId
router.get(
  '/order-success/:orderId',
  userAuth,
  orderController.getOrderSuccessPage
);

// ─── Coupon Operations ────────────────────────────────────────────────────────
router.post('/apply-coupons', userAuth, couponController.applyCoupon);
router.get('/remove-coupon/:cartId', userAuth, couponController.removeCoupon);

module.exports = router;

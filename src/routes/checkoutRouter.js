const express = require("express");
const router = express.Router();
const userAuth = require("../middleware/userAuth");
const {
  getCheckoutPage,
  orderSuccessPage,
  razorPay,
  applyCoupon,
  removeCoupon,
  placeOrder,
  paymentSelection,
  confirmPayment,
  walletPayment,
} = require("../controllers/checkoutController");

router.get("/", userAuth, getCheckoutPage);

router.post('/', userAuth, confirmPayment);

router.post('/wallet', userAuth, walletPayment)

router.post('/place-order', userAuth, placeOrder)

router.get("/payment/:orderId", userAuth, paymentSelection)

router.post('/apply-coupons', userAuth, applyCoupon)

router.get('/remove-coupon/:cartId', userAuth, removeCoupon)

router.post('/order/:id', razorPay);

router.get("/order-success/:orderId", userAuth, orderSuccessPage);

module.exports = router;

const express = require('express');

const router = express.Router();
const userAuth = require('../middleware/userAuth');
const {
  cancelOrder,
  getOrderHistory,
  getOrderDetail,
} = require('../controllers/checkoutController');
const {
  getUserAccount,
  getAddresses,
  addAddress,
  updateDefaultAddress,
  getAddressDetails,
  editAddressPage,
  updateAddress,
  deleteAddress,
  updateUserAccount,
  walletTransactions,
  downloadInvoice,
} = require('../controllers/accountController');
const { updatePassword } = require('../controllers/authController');

router.get('/', userAuth, getUserAccount);

router.get('/addresses', userAuth, getAddresses);

router.post('/addresses', userAuth, addAddress);

router.post('/addresses/default', userAuth, updateDefaultAddress);

router.get('/addresses/:id', userAuth, getAddressDetails);

router.get('/addresses/edit/:id', userAuth, editAddressPage);

router.post('/addresses/edit/:id', userAuth, updateAddress);

router.delete('/addresses/delete/:id', userAuth, deleteAddress);

router.post('/update-password', userAuth, updatePassword);

router.post('/:id', userAuth, updateUserAccount);

router.get('/wallet/transactions', userAuth, walletTransactions);

router.get('/order-history', userAuth, getOrderHistory);

router.get('/order-history/cancel/:id', userAuth, cancelOrder);

router.get('/order-history/:id', userAuth, getOrderDetail);

router.get('/order/:id/invoice', downloadInvoice);

module.exports = router;

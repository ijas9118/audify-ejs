const express = require('express');

const router = express.Router();
const userAuth = require('../middleware/userAuth');
const accountController = require('../controllers/accountController');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');

router.get('/', userAuth, accountController.getUserAccount);

router.get('/addresses', userAuth, accountController.getAddresses);

router.post('/addresses', userAuth, accountController.addAddress);

router.post(
  '/addresses/default',
  userAuth,
  accountController.updateDefaultAddress
);

router.get('/addresses/:id', userAuth, accountController.getAddressDetails);

router.get('/addresses/edit/:id', userAuth, accountController.editAddressPage);

router.post('/addresses/edit/:id', userAuth, accountController.updateAddress);

router.delete(
  '/addresses/delete/:id',
  userAuth,
  accountController.deleteAddress
);

router.post('/update-password', userAuth, authController.updatePassword);

router.post('/:id', userAuth, accountController.updateUserAccount);

router.get(
  '/wallet/transactions',
  userAuth,
  accountController.walletTransactions
);

router.get('/order-history', userAuth, orderController.getOrderHistory);

router.get('/order-history/cancel/:id', userAuth, orderController.cancelOrder);

router.get('/order-history/:id', userAuth, orderController.getOrderDetail);

router.get('/order/:id/invoice', accountController.downloadInvoice);

module.exports = router;

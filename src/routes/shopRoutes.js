const express = require('express');

const router = express.Router();
const userAuth = require('../middleware/userAuth');
const cartController = require('../controllers/cartController');
const shopController = require('../controllers/shopController');

router.get('/', shopController.getShop);

router.post('/filter', shopController.filterShop);

router.get('/product/:id', shopController.getProduct);

router.get('/cart', userAuth, cartController.getCart);

router.get('/stock', shopController.getStock);

router.post('/cart/update', userAuth, cartController.updateCart);

router.post('/cart/add/:id', userAuth, cartController.addToCart);

router.get('/cart/get-cart-item', userAuth, cartController.getCartItemID);

router.delete('/cart/delete/:id', userAuth, cartController.deleteItemFromCart);

router.get('/wishlist', userAuth, shopController.getWishList);

router.post('/wishlist/add/:id', userAuth, shopController.addToWishlist);

router.delete('/wishlist/delete/:id', userAuth, shopController.removeWishlist);

router.get('/search', shopController.searchProducts);

module.exports = router;

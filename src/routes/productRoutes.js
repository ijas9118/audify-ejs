const express = require('express');

const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const productController = require('../controllers/productController');
const upload = require('../middleware/multer');

router.get('/', adminAuth, productController.getProducts);

router.post(
  '/',
  adminAuth,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'supportImages', maxCount: 2 },
  ]),
  productController.addProduct
);

router.get('/toggle/:id', adminAuth, productController.toggleProductStatus);

router.get('/edit/:id', adminAuth, productController.getProductById);

router.post(
  '/edit/:id',
  adminAuth,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'supportImages', maxCount: 2 },
  ]),
  productController.updateProduct
);

module.exports = router;

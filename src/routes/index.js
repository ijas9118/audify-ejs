const express = require('express');

const router = express.Router();

const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');
const shopRoutes = require('./shopRoutes');
const accountRoutes = require('./accountRoutes');
const checkoutRoutes = require('./checkoutRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');

router.use('/', userRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/products', productRoutes);
router.use('/admin/category', categoryRoutes);
router.use('/shop', shopRoutes);
router.use('/account', accountRoutes);
router.use('/checkout', checkoutRoutes);

module.exports = router;

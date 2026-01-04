const express = require('express');

const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const categoryController = require('../controllers/categoryController');

router.get('/', adminAuth, categoryController.getCategory);

router.post('/', adminAuth, categoryController.addCategory);

router.get('/toggle/:id', adminAuth, categoryController.toggleCategoryStatus);

router.delete('/:id', adminAuth, categoryController.deleteCategory);

router.get('/edit/:id', adminAuth, categoryController.getCategoryDetail);

router.post('/edit/:id', adminAuth, categoryController.updateCategory);

module.exports = router;

const { body, validationResult } = require('express-validator');
const Product = require('../../models/products');
const Category = require('../../models/categories');
const Offer = require('../../models/offer');

/**
 * Validation middleware for user signup
 */
exports.signupValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters')
    .escape(),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters')
    .escape(),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

/**
 * Validation middleware for user login
 */
exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password').trim().notEmpty().withMessage('Password is required'),
];

/**
 * Validation middleware for admin login
 */
exports.adminLoginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ max: 50 })
    .withMessage('Username too long')
    .escape(),

  body('password').trim().notEmpty().withMessage('Password is required'),
];

/**
 * Middleware to check validation results and return errors
 * For EJS views: renders the same page with errors and old input
 * For API/AJAX: returns JSON with errors
 */
exports.validate = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array();
    const fieldErrors = errorMessages.reduce((acc, err) => {
      if (err.path && !acc[err.path]) {
        acc[err.path] = err.msg;
      }
      return acc;
    }, {});

    // For AJAX/API requests, return JSON
    if (
      req.xhr ||
      req.is('application/json') ||
      req.get('content-type')?.includes('application/json') ||
      (req.headers.accept && req.headers.accept.indexOf('json') > -1)
    ) {
      return res.status(400).json({
        success: false,
        errors: errorMessages,
      });
    }

    const isAdminLoginRequest = req.originalUrl.includes('/admin/login');
    if (isAdminLoginRequest) {
      return res.status(400).render('admin/adminLogin', {
        title: 'Admin Login',
        errors: fieldErrors,
        formData: { username: req.body.username || '' },
        authError: null,
      });
    }

    const isAdminCouponEditRequest =
      req.method === 'POST' && req.originalUrl.includes('/admin/coupons/edit/');
    if (isAdminCouponEditRequest) {
      return res.status(400).render('layout', {
        title: `Edit Coupon - ${(req.body.code || 'Coupon').toUpperCase()}`,
        viewName: 'admin/editCoupon',
        activePage: 'coupon',
        isAdmin: true,
        coupon: { _id: req.params.id },
        errors: fieldErrors,
        formData: req.body,
        formError: null,
      });
    }

    const isAdminProductEditRequest =
      req.method === 'POST' &&
      req.originalUrl.includes('/admin/products/edit/');
    if (isAdminProductEditRequest) {
      const productId = req.params.id;
      const [product, categories] = await Promise.all([
        Product.findById(productId).populate('categoryId'),
        Category.find(),
      ]);

      if (!product) {
        return res.status(404).render('layout', {
          title: 'Product not found',
          viewName: '404',
          activePage: 'products',
          isAdmin: true,
        });
      }

      const viewProduct = {
        ...product.toObject(),
        name: req.body.name ?? product.name,
        description: req.body.description ?? product.description,
        price: req.body.price ?? product.price,
        stock: req.body.stock ?? product.stock,
        categoryId: req.body.categoryId || product.categoryId,
      };

      return res.status(400).render('layout', {
        title: 'Edit Product',
        viewName: 'admin/editProduct',
        activePage: 'products',
        isAdmin: true,
        product: viewProduct,
        categories,
        errors: fieldErrors,
        formData: req.body,
        formError: null,
      });
    }

    const isAdminOfferEditRequest =
      req.method === 'POST' && req.originalUrl.includes('/admin/offers/edit/');
    if (isAdminOfferEditRequest) {
      const offerId = req.params.id;
      const [offer, products, categories] = await Promise.all([
        Offer.findById(offerId)
          .populate('product', 'name')
          .populate('category', 'name'),
        Product.find({}, 'name'),
        Category.find({}, 'name'),
      ]);

      if (!offer) {
        return res.status(404).render('layout', {
          title: 'Offer not found',
          viewName: '404',
          activePage: 'offer',
          isAdmin: true,
        });
      }

      return res.status(400).render('layout', {
        title: 'Edit Offer',
        viewName: 'admin/editOffer',
        activePage: 'offer',
        isAdmin: true,
        offer,
        products,
        categories,
        errors: fieldErrors,
        formData: req.body,
        formError: null,
      });
    }

    const isAdminCategoryEditRequest =
      req.method === 'POST' &&
      req.originalUrl.includes('/admin/category/edit/');
    if (isAdminCategoryEditRequest) {
      const categoryId = req.params.id;
      const category = await Category.findById(categoryId);

      if (!category) {
        return res.status(404).render('layout', {
          title: 'Category not found',
          viewName: '404',
          activePage: 'category',
          isAdmin: true,
        });
      }

      return res.status(400).render('layout', {
        title: 'Edit Category',
        viewName: 'admin/editCategory',
        activePage: 'category',
        isAdmin: true,
        category,
        errors: fieldErrors,
        formData: req.body,
        formError: null,
      });
    }

    // For form submissions (EJS views), render with errors
    // Determine which view to render based on the route
    let viewName = 'users/signup'; // default
    let title = 'Sign Up';

    if (req.path.includes('login')) {
      viewName = req.path.includes('admin') ? 'admin/login' : 'users/login';
      title = req.path.includes('admin') ? 'Admin Login' : 'Login';
    }

    return res.status(400).render('layout', {
      title,
      header: req.path.includes('admin') ? null : 'partials/header',
      viewName,
      activePage: 'home',
      isAdmin: req.path.includes('admin'),
      errors: errorMessages,
      formData: req.body, // Preserve form data
    });
  }

  return next();
};

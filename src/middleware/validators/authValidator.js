const { body, validationResult } = require('express-validator');

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
exports.validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array();

    // For AJAX/API requests, return JSON
    if (
      req.xhr ||
      (req.headers.accept && req.headers.accept.indexOf('json') > -1)
    ) {
      return res.status(400).json({
        success: false,
        errors: errorMessages,
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

  next();
};

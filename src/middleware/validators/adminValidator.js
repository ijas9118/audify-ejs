const { body } = require('express-validator');
const { validate } = require('./authValidator');

/**
 * Validation middleware for adding/updating products
 */
exports.productValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 100 })
    .withMessage('Product name must be less than 100 characters')
    .escape(),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .escape(),

  body('price')
    .trim()
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('stock')
    .trim()
    .notEmpty()
    .withMessage('Stock is required')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('categoryId')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
];

/**
 * Validation middleware for categories
 */
exports.categoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 50 })
    .withMessage('Category name must be less than 50 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .escape(),
];

/**
 * Validation middleware for coupons
 */
exports.couponValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be between 3 and 20 characters')
    .isAlphanumeric()
    .withMessage('Coupon code must contain only letters and numbers')
    .toUpperCase(),

  body('discountType')
    .trim()
    .notEmpty()
    .withMessage('Discount type is required')
    .isIn(['Percentage', 'Fixed'])
    .withMessage('Invalid discount type'),

  body('discountValue')
    .trim()
    .notEmpty()
    .withMessage('Discount value is required')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),

  body('minCartValue')
    .optional()
    .trim()
    .isFloat({ min: 0 })
    .withMessage('Minimum cart value must be a positive number'),

  body('maxDiscountValue')
    .optional()
    .trim()
    .isFloat({ min: 0 })
    .withMessage('Maximum discount value must be a positive number'),
];

// Export the validate function
exports.validate = validate;

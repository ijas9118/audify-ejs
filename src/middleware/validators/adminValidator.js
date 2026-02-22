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
    .isIn(['percentage', 'fixed'])
    .withMessage('Invalid discount type'),

  body('discountValue')
    .trim()
    .notEmpty()
    .withMessage('Discount value is required')
    .isFloat({ gt: 0 })
    .withMessage('Discount value must be greater than 0')
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && Number(value) > 100) {
        throw new Error('Percentage discount cannot exceed 100');
      }
      return true;
    }),

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

  body('validFrom')
    .trim()
    .notEmpty()
    .withMessage('Valid from date is required')
    .isISO8601()
    .withMessage('Valid from must be a valid date'),

  body('validUntil')
    .trim()
    .notEmpty()
    .withMessage('Valid until date is required')
    .isISO8601()
    .withMessage('Valid until must be a valid date')
    .custom((value, { req }) => {
      const validFrom = new Date(req.body.validFrom);
      const validUntil = new Date(value);
      if (
        Number.isNaN(validFrom.getTime()) ||
        Number.isNaN(validUntil.getTime())
      ) {
        return true;
      }
      if (validUntil < validFrom) {
        throw new Error('Valid until date must be after valid from date');
      }
      return true;
    }),

  body('usageLimit')
    .optional({ values: 'falsy' })
    .trim()
    .isInt({ min: 1 })
    .withMessage('Usage limit must be a positive integer'),
];

/**
 * Validation middleware for offers
 */
exports.offerValidation = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Offer type is required')
    .isIn(['product', 'category'])
    .withMessage('Invalid offer type'),

  body('product')
    .custom((value, { req }) => {
      if (req.body.type === 'product' && !value) {
        throw new Error('Product is required for product offer');
      }
      return true;
    })
    .bail()
    .if(body('product').notEmpty())
    .isMongoId()
    .withMessage('Invalid product selection'),

  body('category')
    .custom((value, { req }) => {
      if (req.body.type === 'category' && !value) {
        throw new Error('Category is required for category offer');
      }
      return true;
    })
    .bail()
    .if(body('category').notEmpty())
    .isMongoId()
    .withMessage('Invalid category selection'),

  body('discountType')
    .trim()
    .notEmpty()
    .withMessage('Discount type is required')
    .isIn(['percentage', 'fixed'])
    .withMessage('Invalid discount type'),

  body('discountValue')
    .trim()
    .notEmpty()
    .withMessage('Discount value is required')
    .isFloat({ gt: 0 })
    .withMessage('Discount value must be greater than 0')
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && Number(value) > 100) {
        throw new Error('Percentage discount cannot exceed 100');
      }
      return true;
    }),

  body('maxDiscountAmount')
    .optional({ values: 'falsy' })
    .trim()
    .isFloat({ min: 0 })
    .withMessage('Maximum discount amount must be a non-negative number'),

  body('validFrom')
    .trim()
    .notEmpty()
    .withMessage('Valid from date is required')
    .isISO8601()
    .withMessage('Valid from must be a valid date'),

  body('validUntil')
    .trim()
    .notEmpty()
    .withMessage('Valid until date is required')
    .isISO8601()
    .withMessage('Valid until must be a valid date')
    .custom((value, { req }) => {
      const validFrom = new Date(req.body.validFrom);
      const validUntil = new Date(value);
      if (
        Number.isNaN(validFrom.getTime()) ||
        Number.isNaN(validUntil.getTime())
      ) {
        return true;
      }
      if (validUntil < validFrom) {
        throw new Error('Valid until date must be after valid from date');
      }
      return true;
    }),
];

// Export the validate function
exports.validate = validate;

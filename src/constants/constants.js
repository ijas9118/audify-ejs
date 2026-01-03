const { StatusCodes } = require('http-status-codes');

const RESPONSE_MESSAGES = {
  // Auth
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  INVALID_CREDENTIALS: 'Invalid Credentials',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User Already Exists',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PASSWORD_UPDATE_SUCCESS: 'Password updated successfully',
  UNAUTHORIZED: 'Unauthorized access',
  OTP_SENT: 'OTP sent successfully',
  OTP_RESENT: 'New OTP sent successfully!',
  INVALID_OTP: 'Invalid OTP',
  OTP_EXPIRED: 'OTP has expired. Please sign up again.',
  NO_SESSION_DATA: 'No user data in session. Please sign up again.',
  ERROR_SENDING_OTP: 'Error sending OTP',

  // Cart
  ITEM_ADDED_TO_CART: 'Item added to cart successfully',
  ITEM_REMOVED_FROM_CART: 'Item removed successfully',
  FAILED_TO_ADD_TO_CART: 'Failed to add item to cart',
  CART_NOT_FOUND: 'Cart not found',
  PRODUCT_NOT_FOUND: 'Product not found',
  USER_ID_REQUIRED: 'User ID is required',

  // Shop/Wishlist
  PRODUCT_ADDED_TO_WISHLIST: 'Product added to wishlist',
  PRODUCT_REMOVED_FROM_WISHLIST: 'Product removed from wishlist successfully',
  ALREADY_IN_WISHLIST: 'Product is already in the wishlist',
  ERROR_FETCHING_PRODUCTS: 'Error fetching products',
  ERROR_FETCHING_STOCK: 'Error fetching stock information',
  ERROR_FETCHING_WISHLIST: 'Error fetching wishlist',

  // Server/General
  SERVER_ERROR: 'Internal server error',
  FAILED_TO_FETCH_DATA: 'Failed to fetch data',

  // Account
  EMAIL_IN_USE: 'Email is already in use',
  ACCOUNT_UPDATED: 'Account updated successfully',
  ADDRESS_UPDATED: 'Address updated successfully',
  DEFAULT_ADDRESS_UPDATED: 'Default address updated successfully',
  ADDRESS_NOT_FOUND: 'Address not found',
  ADDRESS_DELETED: 'Address deleted successfully',
  FAILED_TO_LOGOUT: 'Failed to log out',

  // Admin/User Management
  FAILED_TO_FETCH_USERS: 'Failed to fetch users',

  // Order
  ORDER_NOT_FOUND: 'Order not found',
  ORDER_PLACED: 'Order placed successfully',
  ORDER_CANCELLED: 'Order cancelled successfully',
  ORDER_UPDATED: 'Order updated successfully',
  ORDER_STATUS_UPDATED: 'Order status updated successfully',
  ORDER_CANNOT_BE_CANCELLED: 'Order cannot be cancelled in its current status',
  ERROR_PLACING_ORDER: 'Error placing the order',
  PAYMENT_CONFIRMED: 'Payment confirmed, order updated successfully',

  // Coupon
  COUPON_ADDED: 'Coupon added successfully!',
  COUPON_UPDATED: 'Coupon updated successfully',
  COUPON_DELETED: 'Coupon deleted successfully',
  COUPON_NOT_FOUND: 'Coupon not found',
  COUPON_EXISTS: 'A coupon with this code already exists',
  COUPON_STATUS_UPDATED: 'Coupon status updated',
  INVALID_COUPON: 'Invalid or expired coupon code',
  COUPON_ALREADY_APPLIED: 'A coupon has already been applied to this cart',
  NO_COUPON_APPLIED: 'No coupon applied to this cart',
  COUPON_REMOVED: 'Coupon removed successfully',
  ERROR_ADDING_COUPON: 'An error occurred while adding the coupon',

  // Offer
  OFFER_ADDED: 'Offer added successfully!',
  OFFER_UPDATED: 'Offer updated successfully',
  OFFER_DELETED: 'Offer deleted successfully',
  OFFER_NOT_FOUND: 'Offer not found',
  ERROR_ADDING_OFFER: 'An error occurred while adding the offer',

  // Category
  CATEGORY_NAME_REQUIRED: 'Category name is required',
  CATEGORY_EXISTS: 'Category already exists',
  CATEGORY_ADDED: 'Category added successfully',
  CATEGORY_UPDATED: 'Category updated successfully',
  CATEGORY_DELETED: 'Category deleted successfully',
  CATEGORY_NOT_FOUND: 'Category not found',

  // Product Management (Admin)
  PRODUCT_EXISTS: 'Product with this name already exists',
  MISSING_REQUIRED_FIELDS: 'Please fill all required fields',
  MISSING_IMAGES:
    'Please provide exactly one main image and two support images.',

  // Checkout/Wallet
  INSUFFICIENT_WALLET_BALANCE:
    'Insufficient wallet balance. Please use a different payment method.',
  CART_EMPTY: 'Cart is empty',
};

module.exports = {
  StatusCodes,
  RESPONSE_MESSAGES,
};

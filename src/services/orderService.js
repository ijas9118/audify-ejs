const Cart = require('../models/cart');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Product = require('../models/products');
const User = require('../models/userModel');

/**
 * Order Creation
 */

/**
 * Create order items from cart items
 * @param {Array} cartItems - Cart items array
 * @returns {Promise<Array>} Array of created order items
 */
exports.createOrderItems = async (cartItems) => {
  const orderItems = await Promise.all(
    cartItems.map(async (item) => {
      const orderItem = new OrderItem({
        quantity: item.quantity,
        product: item.productId,
      });
      await orderItem.save();
      return orderItem;
    })
  );

  return orderItems;
};

/**
 * Update product stock after order placement
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to decrement
 * @returns {Promise<Object>} Updated product
 */
exports.updateProductStock = async (productId, quantity) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  const updatedStock = product.stock - quantity;
  const isOutOfStock = updatedStock <= 0;

  await Product.findByIdAndUpdate(productId, {
    $inc: { stock: -quantity, popularity: 1 },
    $set: { isOutOfStock },
  });

  return product;
};

/**
 * Validate stock availability for all cart items before placing order.
 * Throws if any product has insufficient stock.
 * @param {Array} cartItems - Cart items array
 */
exports.validateCartStock = async (cartItems) => {
  const ids = cartItems.map((item) => item.productId);

  const products = await Product.find({ _id: { $in: ids } });

  const productMap = products.reduce((acc, product) => {
    acc[product._id.toString()] = product;
    return acc;
  }, {});

  cartItems.forEach((item) => {
    const product = productMap[item.productId.toString()];

    if (!product) {
      throw new Error(`Product not found: ${item.name || item.productId}`);
    }

    if (!product.isActive) {
      throw new Error(`Product is no longer available: ${product.name}`);
    }

    if (product.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
      );
    }
  });
};

/**
 * Create order from cart — only called AFTER successful payment.
 * @param {string} userId - User ID
 * @param {Object} shippingDetails - Shipping address details
 * @param {string} paymentMethod - 'COD' | 'Wallet' | 'Razorpay'
 * @returns {Promise<Object>} Created order
 */
exports.createOrderFromCart = async (
  userId,
  shippingDetails,
  paymentMethod
) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new Error('Cart not found');
  }

  if (cart.items.length === 0) {
    throw new Error('Cannot place order with empty cart');
  }

  // ✅ Validate stock for every item BEFORE writing anything
  await exports.validateCartStock(cart.items);

  // Create order items
  const orderItems = await exports.createOrderItems(cart.items);

  // Determine order status based on payment method
  // COD = Pending (not yet paid), Razorpay/Wallet = Processed (paid)
  const status = paymentMethod === 'COD' ? 'Pending' : 'Processed';

  // Create order
  const order = new Order({
    user: userId,
    name: shippingDetails.name,
    mobile: shippingDetails.mobile,
    alternateMobile: shippingDetails.alternateMobile || null,
    location: shippingDetails.location,
    city: shippingDetails.city,
    state: shippingDetails.state,
    landmark: shippingDetails.landmark || null,
    zip: shippingDetails.zip,
    orderItems: orderItems.map((item) => item._id),
    shippingCharge: cart.shippingCharge,
    totalAmount: cart.total,
    discountApplied: cart.discountApplied || 0,
    finalTotal: cart.finalTotal || cart.total,
    appliedCoupon: cart.appliedCoupon || null,
    paymentMethod,
    status,
  });

  const placedOrder = await order.save();

  // ✅ Deduct stock AFTER order is saved successfully
  await Promise.all(
    cart.items.map((item) =>
      exports.updateProductStock(item.productId, item.quantity)
    )
  );

  // ✅ Clear cart only after everything succeeded
  await Cart.deleteOne({ user: userId });

  return placedOrder;
};

/**
 * Order Retrieval
 */

/**
 * Get all orders for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options (sort, populate, etc.)
 * @returns {Promise<Array>} Array of orders
 */
exports.getUserOrders = async (userId, options = {}) => {
  const { sort = { dateOrdered: -1 }, populate = true } = options;

  let query = Order.find({ user: userId });

  if (populate) {
    query = query.populate({ path: 'orderItems', populate: 'product' });
  }

  query = query.sort(sort);

  const orders = await query;
  return orders;
};

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @param {boolean} populate - Whether to populate order items and products
 * @returns {Promise<Object>} Order object
 */
exports.getOrderById = async (orderId, populate = true) => {
  let query = Order.findById(orderId);

  if (populate) {
    query = query.populate({
      path: 'orderItems',
      populate: {
        path: 'product',
      },
    });
  }

  const order = await query;

  if (!order) {
    throw new Error('Order not found');
  }

  return order;
};

/**
 * Order Cancellation & Refunds
 */

/**
 * Process refund to user's wallet
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {number} amount - Refund amount
 * @returns {Promise<Object>} Updated user
 */
exports.processOrderRefund = async (userId, orderId, amount) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  await User.findByIdAndUpdate(userId, {
    $inc: { walletBalance: amount },
    $push: {
      walletTransactions: {
        transactionType: 'Credit',
        amount,
        description: `Refund for cancelled order #${orderId}`,
        date: new Date(),
      },
    },
  });

  return user;
};

/**
 * Restore product stock when an order is cancelled
 * @param {Array} orderItems - Populated order items
 */
exports.restoreStockForCancelledOrder = async (orderItems) => {
  await Promise.all(
    orderItems.map(async (item) => {
      await Product.findByIdAndUpdate(item.product._id || item.product, {
        $inc: { stock: item.quantity },
        $set: { isOutOfStock: false },
      });
    })
  );
};

/**
 * Cancel an order with status validation
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID (for validation)
 * @returns {Promise<Object>} Result object
 */
exports.cancelOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId).populate('orderItems');

  if (!order) {
    throw new Error('Order not found');
  }

  // Verify order belongs to user
  if (order.user.toString() !== userId.toString()) {
    throw new Error('Unauthorized to cancel this order');
  }

  if (order.status === 'Cancelled') {
    throw new Error('Order is already cancelled');
  }

  if (order.status === 'Shipped' || order.status === 'Delivered') {
    // For shipped/delivered orders, just mark as cancelled request
    await Order.findByIdAndUpdate(orderId, { isCancelled: true });

    return {
      success: true,
      message: 'Cancellation request submitted for shipped/delivered order',
      refunded: false,
    };
  }

  if (order.status === 'Pending' || order.status === 'Processed') {
    // Restore product stock
    await exports.restoreStockForCancelledOrder(order.orderItems);

    // Only refund if payment was actually made online (not COD and not unpaid)
    const shouldRefund =
      order.paymentMethod === 'Wallet' || order.paymentMethod === 'Razorpay';

    if (shouldRefund) {
      await exports.processOrderRefund(userId, orderId, order.finalTotal);
    }

    await Order.findByIdAndUpdate(orderId, {
      status: 'Cancelled',
      isCancelled: true,
    });

    return {
      success: true,
      message: shouldRefund
        ? 'Order cancelled and refund processed to wallet'
        : 'Order cancelled successfully',
      refunded: shouldRefund,
      refundAmount: shouldRefund ? order.finalTotal : 0,
    };
  }

  throw new Error(
    'Order cannot be cancelled at this stage. Please contact support.'
  );
};

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
 * Create order from cart
 * @param {string} userId - User ID
 * @param {Object} shippingDetails - Shipping address details
 * @returns {Promise<Object>} Created order
 */
exports.createOrderFromCart = async (userId, shippingDetails) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new Error('Cart not found');
  }

  if (cart.items.length === 0) {
    throw new Error('Cannot place order with empty cart');
  }

  // Create order items
  const orderItems = await exports.createOrderItems(cart.items);

  // Update product stock for each item
  await Promise.all(
    cart.items.map((item) =>
      exports.updateProductStock(item.productId, item.quantity)
    )
  );

  // Create order
  const order = new Order({
    user: userId,
    name: shippingDetails.name,
    mobile: shippingDetails.mobile,
    alternateMobile: shippingDetails.alternateMobile,
    location: shippingDetails.location,
    city: shippingDetails.city,
    state: shippingDetails.state,
    landmark: shippingDetails.landmark,
    zip: shippingDetails.zip,
    orderItems: orderItems.map((item) => item._id),
    shippingCharge: cart.shippingCharge,
    totalAmount: cart.total,
    discountApplied: cart.discountApplied,
    finalTotal: cart.finalTotal,
    appliedCoupon: cart.appliedCoupon || null,
    paymentMethod: null,
  });

  const placedOrder = await order.save();

  // Clear cart after successful order
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
 * Cancel an order with status validation
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID (for validation)
 * @returns {Promise<Object>} Result object
 */
exports.cancelOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  // Verify order belongs to user
  if (order.user.toString() !== userId.toString()) {
    throw new Error('Unauthorized to cancel this order');
  }

  // Handle cancellation based on order status
  if (order.status === 'Shipped' || order.status === 'Delivered') {
    // For shipped/delivered orders, just mark as cancelled request
    await Order.findByIdAndUpdate(orderId, {
      isCancelled: true,
    });

    return {
      success: true,
      message: 'Cancellation request submitted for shipped/delivered order',
      refunded: false,
    };
  }
  if (order.status === 'Pending' || order.status === 'Processed') {
    // For pending/processed orders, cancel and refund
    await exports.processOrderRefund(userId, orderId, order.finalTotal);

    await Order.findByIdAndUpdate(orderId, { status: 'Cancelled' });

    return {
      success: true,
      message: 'Order cancelled successfully and refund processed to wallet',
      refunded: true,
      refundAmount: order.finalTotal,
    };
  }
  if (order.status === 'Cancelled') {
    throw new Error('Order is already cancelled');
  } else {
    throw new Error(
      'Order cannot be cancelled at this stage. Please contact support.'
    );
  }
};

/**
 * Get order for checkout/payment page
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID for wallet balance
 * @returns {Promise<Object>} Order and user wallet info
 */
exports.getOrderForPayment = async (orderId, userId) => {
  const order = await exports.getOrderById(orderId, true);
  const user = await User.findById(userId).select('walletBalance');

  if (!user) {
    throw new Error('User not found');
  }

  return {
    order,
    walletBalance: user.walletBalance,
  };
};

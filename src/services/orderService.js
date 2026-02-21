const Cart = require('../models/cart');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Product = require('../models/products');
const User = require('../models/userModel');
const Coupon = require('../models/coupon');
// eslint-disable-next-line import/no-cycle
const couponService = require('./couponService');

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
  // Use atomic findOneAndUpdate with stock condition to prevent race conditions
  const product = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity, popularity: 1 } },
    { new: true }
  );

  if (!product) {
    const existing = await Product.findById(productId);
    if (!existing) throw new Error('Product not found');
    throw new Error(
      `Insufficient stock for "${existing.name}". Available: ${existing.stock}, Requested: ${quantity}`
    );
  }

  // Sync isOutOfStock flag if it reached zero
  if (product.stock === 0 && !product.isOutOfStock) {
    await Product.findByIdAndUpdate(productId, {
      $set: { isOutOfStock: true },
    });
  }

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

  // ✅ Re-validate coupon if one is applied to prevent race conditions on usage limits
  if (cart.appliedCoupon) {
    await couponService.validateCoupon(cart.appliedCoupon, userId);
  }

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
  const succeededStockUpdates = [];
  try {
    await Promise.all(
      cart.items.map(async (item) => {
        await exports.updateProductStock(item.productId, item.quantity);
        succeededStockUpdates.push(item);
      })
    );
  } catch (error) {
    // ⚠️ Rollback: Restore stock for items that were already decremented
    if (succeededStockUpdates.length > 0) {
      await exports.restoreStockForCancelledOrder(
        succeededStockUpdates.map((item) => ({
          product: { _id: item.productId },
          quantity: item.quantity,
        }))
      );
    }

    // ⚠️ Rollback: Remove the order and its items since fulfillment failed
    await Order.findByIdAndDelete(placedOrder._id);
    await OrderItem.deleteMany({ _id: { $in: orderItems.map((i) => i._id) } });

    throw error;
  }

  // ✅ Clear cart only after everything succeeded
  await Cart.deleteOne({ user: userId });

  // ✅ Increment coupon usage counter if applied
  if (placedOrder.appliedCoupon) {
    await Coupon.findOneAndUpdate(
      { code: placedOrder.appliedCoupon },
      {
        $inc: { totalUsed: 1 },
        $addToSet: { appliedUsers: userId },
      }
    );
  }

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
  const { sort = { createdAt: -1 }, populate = true } = options;

  let query = Order.find({ user: userId });

  if (populate) {
    query = query.populate({ path: 'orderItems', populate: 'product' });
  }

  query = query.sort(sort);

  const orders = await query;
  return orders;
};

/**
 * Get order by MongoDB _id or human-readable orderId (ORD-XXXXX).
 * @param {string} idOrOrderId - MongoDB ObjectId string OR 'ORD-XXXXX' string
 * @param {boolean} populate - Whether to populate order items and products
 * @returns {Promise<Object>} Order object
 */
exports.getOrderById = async (idOrOrderId, populate = true) => {
  const isHumanId =
    typeof idOrOrderId === 'string' && idOrOrderId.startsWith('ORD-');

  let query;
  if (isHumanId) {
    query = Order.findOne({ orderId: idOrOrderId });
  } else {
    query = Order.findById(idOrOrderId);
  }

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
exports.processOrderRefund = async (userId, orderRef, amount) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // orderRef may be the full Order document, a plain orderId string, or a MongoDB _id
  const label =
    typeof orderRef === 'object' && orderRef.orderId
      ? orderRef.orderId
      : String(orderRef);

  await User.findByIdAndUpdate(userId, {
    $inc: { walletBalance: amount },
    $push: {
      walletTransactions: {
        transactionType: 'Credit',
        amount,
        description: `Refund for cancelled order #${label}`,
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
 * Request cancellation of an order.
 * This ONLY marks cancellationRequested = true.
 * Actual cancellation (status change, stock restore, refund) is performed
 * by the admin when they approve the request via updateOrderStatus → 'Cancelled'.
 *
 * @param {string} orderId - MongoDB _id of the order
 * @param {string} userId  - ID of the requesting user (for ownership check)
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

  if (order.status === 'Cancelled') {
    throw new Error('Order is already cancelled');
  }

  if (order.cancellationRequested) {
    throw new Error(
      'A cancellation request has already been submitted for this order'
    );
  }

  // Delivered orders cannot be cancelled by the user
  if (order.status === 'Delivered') {
    throw new Error(
      'Delivered orders cannot be cancelled. Please contact support.'
    );
  }

  // For all other statuses (Pending, Processed, Shipped) — flag it and wait for admin
  await Order.findByIdAndUpdate(orderId, { cancellationRequested: true });

  return {
    success: true,
    requested: true,
    message:
      'Cancellation request submitted. Our team will review it and process it shortly.',
  };
};

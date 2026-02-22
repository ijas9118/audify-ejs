const Order = require('../models/order');
const { getPaginationMeta } = require('../utils/pagination');
// eslint-disable-next-line import/no-cycle
const orderService = require('./orderService');

const MIN_LIMIT = 5;
const MAX_LIMIT = 15;

// ─── Status State Machine ──────────────────────────────────────────────────────
/**
 * Defines the ONLY valid forward transitions for order status.
 * Using a Map avoids object-injection lint warnings (no prototype chain).
 *
 * Business rules:
 *  - COD orders start as Pending; admin moves them to Processed after payment collected.
 *  - Online-paid orders (Razorpay/Wallet) start as Processed.
 *  - All orders flow linearly: Pending → Processed → Shipped → Delivered.
 *  - Any non-terminal status can move to Cancelled (admin-triggered stock restore & refund).
 *  - Delivered and Cancelled are terminal — no further changes.
 */
const VALID_TRANSITIONS = new Map([
  ['Pending', ['Processed', 'Cancelled']],
  ['Processed', ['Shipped', 'Cancelled']],
  ['Shipped', ['Delivered', 'Cancelled']],
  ['Delivered', []], // terminal — cannot be changed
  ['Cancelled', []], // terminal — cannot be changed
]);

/**
 * Return the list of statuses the admin is allowed to move an order to,
 * given its current status.
 * @param {string} currentStatus
 * @returns {string[]}
 */
exports.getAllowedNextStatuses = (currentStatus) =>
  VALID_TRANSITIONS.get(currentStatus) ?? [];

exports.getPaginatedOrders = async ({ page, limit }) => {
  const total = await Order.countDocuments();
  const pagination = getPaginationMeta({
    total,
    page,
    limit,
    minLimit: MIN_LIMIT,
    maxLimit: MAX_LIMIT,
  });

  const orders = await Order.find()
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  return {
    orders,
    pagination,
  };
};

/**
 * Update an order's status with full state-machine validation.
 *
 * When the admin approves a cancellation (newStatus === 'Cancelled'):
 *   - Stock is restored for all order items.
 *   - Refund is processed to the user's wallet (for Razorpay/Wallet payments).
 *   - cancellationRequested flag is cleared.
 *
 * @param {string} orderId   - MongoDB _id or ORD-XXXXX
 * @param {string} newStatus - Desired new status
 * @returns {Promise<Object>} Updated order + optional refund metadata
 */
exports.updateOrderStatus = async (orderId, newStatus) => {
  // ── 1. Resolve the order first so we can validate the current status ──────
  const isHumanId = typeof orderId === 'string' && orderId.startsWith('ORD-');
  const filter = isHumanId ? { orderId } : { _id: orderId };

  // Populate orderItems so we can restore stock without a second query
  const order = await Order.findOne(filter).populate('orderItems');

  if (!order) {
    throw new Error('Order not found');
  }

  const { status: currentStatus } = order;

  // ── 2. Reject unknown target statuses (guard against tampered requests) ───
  if (!VALID_TRANSITIONS.has(newStatus)) {
    throw new Error(`Invalid status value: "${newStatus}"`);
  }

  // ── 3. Enforce the state machine ──────────────────────────────────────────
  if (currentStatus === newStatus) {
    throw new Error(`Order is already in "${newStatus}" status`);
  }

  const allowed = VALID_TRANSITIONS.get(currentStatus) ?? [];
  if (!allowed.includes(newStatus)) {
    if (allowed.length === 0) {
      throw new Error(
        `Order is in a terminal status ("${currentStatus}") and cannot be changed`
      );
    }
    throw new Error(
      `Cannot move order from "${currentStatus}" to "${newStatus}". ` +
        `Allowed next statuses: ${allowed.join(', ')}`
    );
  }

  // ── 4. Side-effects when admin approves a cancellation ───────────────────
  let refunded = false;
  let refundAmount = 0;

  if (newStatus === 'Cancelled') {
    // Restore product stock for every item in the order
    await orderService.restoreStockForCancelledOrder(order.orderItems);

    // Refund to wallet for paid orders (not COD / not unpaid Pending)
    const shouldRefund =
      order.paymentMethod === 'Wallet' || order.paymentMethod === 'Razorpay';

    if (shouldRefund) {
      await orderService.processOrderRefund(
        order.user,
        order,
        order.finalTotal
      );
      refunded = true;
      refundAmount = order.finalTotal;
    }
  }

  // ── 5. Apply the status update ────────────────────────────────────────────
  const updateFields = { status: newStatus };

  // Always clear the cancellation request flag when the admin processes cancellation,
  // and also clear it when admin moves forward (e.g., Shipped → Delivered) to resolve
  // any stale flags from declined requests.
  if (order.cancellationRequested) {
    updateFields.cancellationRequested = false;
  }

  const updatedOrder = await Order.findOneAndUpdate(
    filter,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  return { updatedOrder, refunded, refundAmount };
};

exports.getOrderById = async (orderId) => {
  // Support both MongoDB _id and human-readable ORD-XXXXX
  const isHumanId = typeof orderId === 'string' && orderId.startsWith('ORD-');
  const filter = isHumanId ? { orderId } : { _id: orderId };

  const order = await Order.findOne(filter)
    .populate('user', 'firstName lastName email mobile')
    .populate({ path: 'orderItems', populate: 'product' });

  if (!order) {
    throw new Error('Order not found');
  }

  return order;
};

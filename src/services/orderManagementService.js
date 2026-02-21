const Order = require('../models/order');
const { getPaginationMeta } = require('../utils/pagination');

const MIN_LIMIT = 5;
const MAX_LIMIT = 15;

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

exports.updateOrderStatus = async (orderId, status) => {
  // Support both MongoDB _id and human-readable ORD-XXXXX
  const isHumanId = typeof orderId === 'string' && orderId.startsWith('ORD-');
  const filter = isHumanId ? { orderId } : { _id: orderId };

  const order = await Order.findOneAndUpdate(
    filter,
    { $set: { status } },
    { new: true }
  );

  if (!order) {
    throw new Error('Order not found');
  }

  return order;
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

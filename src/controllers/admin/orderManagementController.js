const asyncHandler = require('express-async-handler');
const Order = require('../../models/order');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  Order Management Controllers
// ============================

// Render Order Management Page
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ dateOrdered: -1 });

  res.render('layout', {
    title: 'Order Management',
    viewName: 'admin/orderManagement',
    activePage: 'orders',
    isAdmin: true,
    orders,
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  const updatedOrder = await Order.updateOne(
    { _id: orderId },
    { $set: { status } }
  );

  if (!updatedOrder) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ success: false, message: RESPONSE_MESSAGES.ORDER_NOT_FOUND });
  }

  res.status(StatusCodes.OK).json({ success: true, order: updatedOrder });
});

const viewOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await Order.findById({ _id: orderId })
    .populate('user', 'firstName lastName email mobile')
    .populate({ path: 'orderItems', populate: 'product' });

  res.render('layout', {
    title: 'Order Management',
    viewName: 'admin/viewOrder',
    activePage: 'orders',
    isAdmin: true,
    order,
  });
});

module.exports = {
  getOrders,
  updateOrderStatus,
  viewOrder,
};

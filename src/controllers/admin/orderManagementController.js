const asyncHandler = require('express-async-handler');
const orderManagementService = require('../../services/orderManagementService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  Order Management Controllers
// ============================

// Render Order Management Page
const getOrders = asyncHandler(async (req, res) => {
  const { orders, pagination } =
    await orderManagementService.getPaginatedOrders({
      page: req.query.page,
      limit: req.query.limit,
    });

  res.render('layout', {
    title: 'Order Management',
    viewName: 'admin/orderManagement',
    activePage: 'orders',
    isAdmin: true,
    orders,
    pagination,
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  try {
    const updatedOrder = await orderManagementService.updateOrderStatus(
      orderId,
      status
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.ORDER_STATUS_UPDATED,
      order: updatedOrder,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.ORDER_NOT_FOUND });
    }

    throw error;
  }
});

const viewOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  let order;

  try {
    order = await orderManagementService.getOrderById(orderId);
  } catch (error) {
    if (error.message === 'Order not found') {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
    }

    throw error;
  }

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

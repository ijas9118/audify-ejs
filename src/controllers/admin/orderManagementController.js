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
    const { updatedOrder, refunded, refundAmount } =
      await orderManagementService.updateOrderStatus(orderId, status);

    let message = RESPONSE_MESSAGES.ORDER_STATUS_UPDATED;
    if (status === 'Cancelled' && refunded) {
      message = `Order cancelled and ₹${refundAmount.toFixed(2)} refunded to user's wallet.`;
    } else if (status === 'Cancelled') {
      message = 'Order cancelled successfully.';
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message,
      order: updatedOrder,
      refunded,
      refundAmount,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.ORDER_NOT_FOUND });
    }

    // State-machine violations and invalid-value errors — surface them clearly
    if (
      error.message.includes('Cannot move order') ||
      error.message.includes('terminal status') ||
      error.message.includes('already in') ||
      error.message.includes('Invalid status value')
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: error.message });
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

  // Pre-compute allowed next statuses to pass to the view
  const allowedNextStatuses = orderManagementService.getAllowedNextStatuses(
    order.status
  );

  res.render('layout', {
    title: 'Order Management',
    viewName: 'admin/viewOrder',
    activePage: 'orders',
    isAdmin: true,
    order,
    allowedNextStatuses,
  });
});

module.exports = {
  getOrders,
  updateOrderStatus,
  viewOrder,
};

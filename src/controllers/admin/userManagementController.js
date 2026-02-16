const asyncHandler = require('express-async-handler');
const userManagementService = require('../../services/userManagementService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  User Management Controllers
// ============================

// Render User Management Page
const getUsers = asyncHandler(async (req, res) => {
  const { users, pagination, search } =
    await userManagementService.getPaginatedUsers({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    });

  res.render('layout', {
    title: 'User Management',
    viewName: 'admin/userManagement',
    activePage: 'users',
    isAdmin: true,
    users,
    pagination,
    search,
  });
});

// Toggle user status
const toggleUserStatus = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  try {
    await userManagementService.toggleUserStatus(userId);
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    throw error;
  }

  const page = req.query.page || '1';
  const limit = req.query.limit || '10';
  const search = (req.query.search || '').trim();
  const queryParams = new URLSearchParams({ page, limit });

  if (search) {
    queryParams.set('search', search);
  }

  res.redirect(`/admin/users?${queryParams.toString()}`);
});

module.exports = {
  getUsers,
  toggleUserStatus,
};

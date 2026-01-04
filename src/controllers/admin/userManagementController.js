const asyncHandler = require('express-async-handler');
const User = require('../../models/userModel');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  User Management Controllers
// ============================

// Render User Management Page
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();

  if (!users) {
    throw new Error(RESPONSE_MESSAGES.FAILED_TO_FETCH_USERS);
  }

  res.render('layout', {
    title: 'User Management',
    viewName: 'admin/userManagement',
    activePage: 'users',
    isAdmin: true,
    users,
  });
});

// Toggle user status
const toggleUserStatus = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Find user by ID
  const user = await User.findById(userId);
  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  // Determine the new status
  const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';

  // Update the status field only
  const result = await User.updateOne(
    { _id: userId },
    { $set: { status: newStatus } }
  );

  // Check if the update was successful
  if (result.modifiedCount === 0) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  // Redirect back to user management page
  res.redirect('/admin/users');
});

module.exports = {
  getUsers,
  toggleUserStatus,
};

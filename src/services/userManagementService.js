const User = require('../models/userModel');
const { getPaginationMeta } = require('../utils/pagination');

const MIN_LIMIT = 5;
const MAX_LIMIT = 15;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSearchFilter = (search) => {
  const query = (search || '').trim();

  if (!query) {
    return {};
  }

  const regex = new RegExp(escapeRegex(query), 'i');

  return {
    $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
  };
};

exports.getPaginatedUsers = async ({ page, limit, search }) => {
  const filter = buildSearchFilter(search);
  const total = await User.countDocuments(filter);
  const pagination = getPaginationMeta({
    total,
    page,
    limit,
    minLimit: MIN_LIMIT,
    maxLimit: MAX_LIMIT,
  });

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  return {
    users,
    pagination,
    search: (search || '').trim(),
  };
};

exports.toggleUserStatus = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const updatedStatus = user.status === 'Active' ? 'Inactive' : 'Active';

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { status: updatedStatus } },
    { new: true }
  );

  return updatedUser;
};

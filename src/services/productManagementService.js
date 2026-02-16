const Product = require('../models/products');
const Category = require('../models/categories');
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
  return { name: regex };
};

exports.getProductManagementData = async ({ page, limit, search }) => {
  const filter = buildSearchFilter(search);

  const total = await Product.countDocuments(filter);
  const pagination = getPaginationMeta({
    total,
    page,
    limit,
    minLimit: MIN_LIMIT,
    maxLimit: MAX_LIMIT,
  });

  const products = await Product.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    { $unwind: '$categoryDetails' },
    { $sort: { createdAt: -1 } },
    { $skip: pagination.skip },
    { $limit: pagination.limit },
  ]);

  const categories = await Category.find().sort({ name: 1 });

  return {
    products,
    categories,
    pagination,
    search: (search || '').trim(),
  };
};

exports.toggleProductStatus = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  product.isActive = !product.isActive;
  await product.save();

  return product;
};

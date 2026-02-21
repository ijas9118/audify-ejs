const Category = require('../models/categories');
const Product = require('../models/products');
const { getPaginationMeta } = require('../utils/pagination');
const { escapeRegex } = require('../utils/regex');

const MIN_LIMIT = 5;
const MAX_LIMIT = 15;

const buildSearchFilter = (search) => {
  const query = (search || '').trim();

  const filter = { isDeleted: { $ne: true } };

  if (query) {
    filter.$or = [
      { name: { $regex: escapeRegex(query), $options: 'i' } },
      { description: { $regex: escapeRegex(query), $options: 'i' } },
    ];
  }

  return filter;
};

/**
 * Category Retrieval Operations
 */

/**
 * Get all categories
 * @returns {Promise<Array>} Array of category objects
 */
exports.getAllCategories = async () => {
  const categories = await Category.find({ isDeleted: { $ne: true } });
  if (!categories) {
    throw new Error('Failed to fetch categories');
  }
  return categories;
};

exports.getPaginatedCategories = async ({ page, limit, search }) => {
  const filter = buildSearchFilter(search);
  const total = await Category.countDocuments(filter);
  const pagination = getPaginationMeta({
    total,
    page,
    limit,
    minLimit: MIN_LIMIT,
    maxLimit: MAX_LIMIT,
  });

  const categories = await Category.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  return {
    categories,
    pagination,
    search: (search || '').trim(),
  };
};

/**
 * Get category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Category object
 */
exports.getCategoryById = async (categoryId) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: { $ne: true },
  });
  if (!category) {
    throw new Error('Category not found');
  }
  return category;
};

/**
 * Category Management Operations
 */

/**
 * Create a new category with uniqueness validation
 * @param {string} name - Category name
 * @param {string} description - Category description
 * @returns {Promise<Object>} Created category
 */
exports.createCategory = async (name, description) => {
  if (!name || !name.trim()) {
    throw new Error('Category name is required');
  }

  const normalizedName = name.trim();

  // Check if category already exists (case-insensitive)
  const existingCategory = await Category.findOne({
    name: { $regex: escapeRegex(normalizedName), $options: 'i' },
    isDeleted: { $ne: true },
  });
  if (existingCategory) {
    throw new Error('Category already exists');
  }

  const newCategory = new Category({ name: normalizedName, description });
  await newCategory.save();

  return newCategory;
};

/**
 * Update an existing category
 * @param {string} categoryId - Category ID
 * @param {string} name - Updated category name
 * @param {string} description - Updated category description
 * @returns {Promise<Object>} Updated category
 */
exports.updateCategory = async (categoryId, name, description) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: { $ne: true },
  });
  if (!category) {
    throw new Error('Category not found');
  }

  if (!name || !name.trim()) {
    throw new Error('Category name is required');
  }

  const normalizedName = name.trim();

  const existingCategory = await Category.findOne({
    name: { $regex: escapeRegex(normalizedName), $options: 'i' },
    _id: { $ne: categoryId },
    isDeleted: { $ne: true },
  });
  if (existingCategory) {
    throw new Error('Category already exists');
  }

  category.name = normalizedName;
  category.description = description;

  await category.save();

  return category;
};

/**
 * Toggle category active/inactive status
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Updated category
 */
exports.toggleCategoryStatus = async (categoryId) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: { $ne: true },
  });
  if (!category) {
    throw new Error('Category not found');
  }

  category.isActive = !category.isActive;
  await category.save();

  return category;
};

/**
 * Delete a category with product association validation
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Deleted category
 */
exports.deleteCategory = async (categoryId) => {
  // Find the category by ID
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: { $ne: true },
  });
  if (!category) {
    throw new Error('Category not found');
  }

  // Count products associated with this category
  const productCount = await Product.countDocuments({
    categoryId,
    isActive: true,
  });

  if (productCount > 0) {
    throw new Error(
      `Cannot delete category. There are ${productCount} active product(s) associated with this category.`
    );
  }

  // Soft delete the category
  category.isDeleted = true;
  category.isActive = false; // Also deactivate it for safety
  await category.save();

  return category;
};

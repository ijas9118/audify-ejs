const Category = require('../models/categories');
const Product = require('../models/products');

/**
 * Category Retrieval Operations
 */

/**
 * Get all categories
 * @returns {Promise<Array>} Array of category objects
 */
exports.getAllCategories = async () => {
  const categories = await Category.find();
  if (!categories) {
    throw new Error('Failed to fetch categories');
  }
  return categories;
};

/**
 * Get category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Category object
 */
exports.getCategoryById = async (categoryId) => {
  const category = await Category.findById(categoryId);
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
  if (!name) {
    throw new Error('Category name is required');
  }

  // Check if category already exists
  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    throw new Error('Category already exists');
  }

  const newCategory = new Category({ name, description });
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
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error('Category not found');
  }

  category.name = name;
  category.description = description;

  await category.save();

  return {
    name: category.name,
    description: category.description,
  };
};

/**
 * Toggle category active/inactive status
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Updated category
 */
exports.toggleCategoryStatus = async (categoryId) => {
  const category = await Category.findById(categoryId);
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
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error('Category not found');
  }

  // Count products associated with this category
  const productCount = await Product.countDocuments({ categoryId });

  if (productCount > 0) {
    throw new Error(
      `Cannot delete category. There are ${productCount} product(s) associated with this category.`
    );
  }

  // Delete the category
  await Category.findByIdAndDelete(categoryId);

  return category;
};

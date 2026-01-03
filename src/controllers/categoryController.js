const asyncHandler = require('express-async-handler');
const Category = require('../models/categories');
const Product = require('../models/products');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

// Render Category Management Page
exports.getCategory = asyncHandler(async (req, res) => {
  const categories = await Category.find();

  if (!categories) {
    throw new Error(RESPONSE_MESSAGES.FAILED_TO_FETCH_DATA);
  }

  res.render('layout', {
    title: 'Category Management',
    viewName: 'admin/categoryManagement',
    activePage: 'category',
    isAdmin: true,
    categories,
  });
});

// Controller to add a new category
exports.addCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: RESPONSE_MESSAGES.CATEGORY_NAME_REQUIRED });
  }

  const existingCategory = await Category.findOne({ name });

  if (existingCategory) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: RESPONSE_MESSAGES.CATEGORY_EXISTS });
  }

  const newCategory = new Category({ name, description });
  await newCategory.save();

  res.status(StatusCodes.CREATED).json({
    message: RESPONSE_MESSAGES.CATEGORY_ADDED,
    category: newCategory,
  });
});

// Unlist Category
exports.toggleCategoryStatus = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  const category = await Category.findById(categoryId);

  if (!category) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error(RESPONSE_MESSAGES.CATEGORY_NOT_FOUND);
  }

  category.isActive = !category.isActive;

  await category.save();

  res.redirect('/admin/category');
});

// Controller to delete a category
exports.deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  // Find the category by ID
  const category = await Category.findById(categoryId);

  if (!category) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: RESPONSE_MESSAGES.CATEGORY_NOT_FOUND,
    });
  }

  // Count products associated with this category
  const products = await Product.countDocuments({ categoryId });

  if (products > 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `Cannot delete category. There are ${products} product(s) associated with this category.`,
    });
  }

  // Delete the category
  await Category.findByIdAndDelete(categoryId);
  res.status(StatusCodes.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.CATEGORY_DELETED,
  });
});

// Get edit category page
exports.getCategoryDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch category details
  const category = await Category.findById(id);
  if (!category) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error(RESPONSE_MESSAGES.CATEGORY_NOT_FOUND);
  }

  // Render the edit page with product details and categories
  res.render('layout', {
    title: 'Edit Category',
    viewName: 'admin/editCategory',
    activePage: 'category',
    isAdmin: true,
    category,
  });
});

// Update category details
exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: RESPONSE_MESSAGES.CATEGORY_NOT_FOUND });
  }

  category.name = name;
  category.description = description;

  await category.save();

  res.status(StatusCodes.OK).json({
    message: RESPONSE_MESSAGES.CATEGORY_UPDATED,
    category: { name: category.name, description: category.description },
  });
});

const asyncHandler = require('express-async-handler');
const categoryService = require('../services/categoryService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

// Render Category Management Page
const getCategory = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();

  res.render('layout', {
    title: 'Category Management',
    viewName: 'admin/categoryManagement',
    activePage: 'category',
    isAdmin: true,
    categories,
  });
});

// Controller to add a new category
const addCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  try {
    const newCategory = await categoryService.createCategory(name, description);

    res.status(StatusCodes.CREATED).json({
      message: RESPONSE_MESSAGES.CATEGORY_ADDED,
      category: newCategory,
    });
  } catch (error) {
    if (error.message === 'Category name is required') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: RESPONSE_MESSAGES.CATEGORY_NAME_REQUIRED });
    }

    if (error.message === 'Category already exists') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: RESPONSE_MESSAGES.CATEGORY_EXISTS });
    }

    throw error;
  }
});

// Unlist Category
const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  try {
    await categoryService.toggleCategoryStatus(categoryId);
    res.redirect('/admin/category');
  } catch (error) {
    if (error.message === 'Category not found') {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error(RESPONSE_MESSAGES.CATEGORY_NOT_FOUND);
    }

    throw error;
  }
});

// Controller to delete a category
const deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  try {
    await categoryService.deleteCategory(categoryId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.CATEGORY_DELETED,
    });
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: RESPONSE_MESSAGES.CATEGORY_NOT_FOUND,
      });
    }

    if (error.message.includes('Cannot delete category')) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }
});

// Get edit category page
const getCategoryDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const category = await categoryService.getCategoryById(id);

    res.render('layout', {
      title: 'Edit Category',
      viewName: 'admin/editCategory',
      activePage: 'category',
      isAdmin: true,
      category,
    });
  } catch (error) {
    if (error.message === 'Category not found') {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error(RESPONSE_MESSAGES.CATEGORY_NOT_FOUND);
    }

    throw error;
  }
});

// Update category details
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params;

  try {
    const updatedCategory = await categoryService.updateCategory(
      id,
      name,
      description
    );

    res.status(StatusCodes.OK).json({
      message: RESPONSE_MESSAGES.CATEGORY_UPDATED,
      category: updatedCategory,
    });
  } catch (error) {
    if (error.message === 'Category not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: RESPONSE_MESSAGES.CATEGORY_NOT_FOUND });
    }

    throw error;
  }
});

module.exports = {
  getCategory,
  addCategory,
  toggleCategoryStatus,
  deleteCategory,
  getCategoryDetail,
  updateCategory,
};

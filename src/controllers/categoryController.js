const Category = require("../models/categories");
const Product = require("../models/products");
const asyncHandler = require("express-async-handler");

// Render Category Management Page
exports.getCategory = asyncHandler(async (req, res) => {
  const categories = await Category.find();

  if (!categories) {
    throw new Error("Failed to fetch users");
  }

  res.render("layout", {
    title: "Category Management",
    viewName: "admin/categoryManagement",
    activePage: "category",
    isAdmin: true,
    categories: categories,
  });
});

// Controller to add a new category
exports.addCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  const existingCategory = await Category.findOne({ name });

  if (existingCategory) {
    return res.status(400).json({ message: "Category already exists" });
  }

  const newCategory = new Category({ name, description });
  await newCategory.save();

  res
    .status(201)
    .json({ message: "Category added successfully", category: newCategory });
});

// Unlist Category
exports.toggleCategoryStatus = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  const category = await Category.findById(categoryId);

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  category.isActive = !category.isActive;

  await category.save();

  res.redirect("/admin/category");
});

// Controller to delete a category
exports.deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  // Find the category by ID
  const category = await Category.findById(categoryId);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  // Count products associated with this category
  const products = await Product.countDocuments({ categoryId: categoryId });

  if (products > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category. There are ${products} product(s) associated with this category.`,
    });
  }

  // Delete the category
  await Category.findByIdAndDelete(categoryId);
  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});

// Get edit category page
exports.getCategoryDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch category details
  const category = await Category.findById(id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  // Render the edit page with product details and categories
  res.render("layout", {
    title: "Edit Category",
    viewName: "admin/editCategory",
    activePage: "category",
    isAdmin: true,
    category,
  });
});

// Update category details
exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const id = req.params.id;

  let category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.name = name;
  category.description = description;

  await category.save();

  res.status(200).json({
    message: "Category updated successfully",
    category: { name: category.name, description: category.description },
  });
});

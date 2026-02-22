const asyncHandler = require('express-async-handler');
const Product = require('../models/products');
const Category = require('../models/categories');
const uploadService = require('../services/uploadService');
const productManagementService = require('../services/productManagementService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');
const { escapeRegex } = require('../utils/regex');

// Render Product Management Page
const getProducts = asyncHandler(async (req, res) => {
  const { products, categories, pagination, search } =
    await productManagementService.getProductManagementData({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    });

  res.render('layout', {
    title: 'Product Management',
    viewName: 'admin/productManagement',
    activePage: 'products',
    isAdmin: true,
    products,
    categories,
    pagination,
    search,
  });
});

// Add new product
const addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, categoryId, stock } = req.body;

  // Check required text fields FIRST (before any image upload work)
  if (!name || !price || !categoryId || !stock) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: RESPONSE_MESSAGES.MISSING_REQUIRED_FIELDS });
  }

  const mainImageFile = req.files?.mainImage ? req.files.mainImage[0] : null;
  const supportImageFiles = req.files?.supportImages
    ? req.files.supportImages
    : [];

  if (!mainImageFile || supportImageFiles.length !== 2) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: RESPONSE_MESSAGES.MISSING_IMAGES,
    });
  }

  // Check if a product with the same name already exists
  const existingProduct = await Product.findOne({
    name: { $regex: escapeRegex(name), $options: 'i' },
  });
  if (existingProduct) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: RESPONSE_MESSAGES.PRODUCT_EXISTS });
  }

  // Upload images using uploadService
  const { mainImageUrl, supportImageUrls } =
    await uploadService.uploadProductImages(mainImageFile, supportImageFiles);

  // Create a new product document
  const product = new Product({
    name,
    description,
    price,
    categoryId,
    stock,
    images: {
      main: mainImageUrl,
      supports: supportImageUrls,
    },
  });

  // Save the product to the database
  await product.save();

  // Respond with success (AJAX caller will redirect)
  return res.status(StatusCodes.CREATED).json({ success: true });
});

// Unlist Product
const toggleProductStatus = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  try {
    await productManagementService.toggleProductStatus(productId);
  } catch (error) {
    if (error.message === 'Product not found') {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error(RESPONSE_MESSAGES.PRODUCT_NOT_FOUND);
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

  res.redirect(`/admin/products?${queryParams.toString()}`);
});

// Get product for editing
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch product details
  const product = await Product.findById(id).populate('categoryId');
  if (!product) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error(RESPONSE_MESSAGES.PRODUCT_NOT_FOUND);
  }

  // Fetch categories for the dropdown
  const categories = await Category.find();

  // Render the edit page with product details and categories
  res.render('layout', {
    title: 'Edit Product',
    viewName: 'admin/editProduct',
    activePage: 'products',
    isAdmin: true,
    product,
    categories,
    errors: {},
    formData: null,
    formError: null,
  });
});

// Update product
const updateProduct = asyncHandler(async (req, res) => {
  const { name, price, categoryId, stock, description } = req.body;
  const productId = req.params.id;

  const product = await Product.findById(productId);

  if (!product) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: RESPONSE_MESSAGES.PRODUCT_NOT_FOUND });
  }

  // Keep existing images, update only if new ones are provided
  const updatedImages = { ...product.images };

  // Handle image uploads using uploadService
  if (req.files.mainImage && req.files.mainImage.length > 0) {
    updatedImages.main = await uploadService.uploadToCloudinary(
      req.files.mainImage[0].buffer
    );
  }

  if (req.files.supportImages && req.files.supportImages.length > 0) {
    updatedImages.supports = await uploadService.uploadMultipleImages(
      req.files.supportImages
    );
  }

  // Update product details
  product.name = name;
  product.price = price;
  product.categoryId = categoryId;
  product.stock = stock || 0;
  product.isOutOfStock = !stock;
  product.description = description;
  product.images = updatedImages;

  await product.save();

  return res.redirect('/admin/products/');
});

module.exports = {
  getProducts,
  addProduct,
  toggleProductStatus,
  getProductById,
  updateProduct,
};

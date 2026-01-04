const asyncHandler = require('express-async-handler');
const Product = require('../models/products');
const Category = require('../models/categories');
const uploadService = require('../services/uploadService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

// Render Product Management Page
const getProducts = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  const products = await Product.aggregate([
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    {
      $unwind: '$categoryDetails',
    },
  ]);

  res.render('layout', {
    title: 'Product Management',
    viewName: 'admin/productManagement',
    activePage: 'products',
    isAdmin: true,
    products,
    categories,
  });
});

// Add new product
const addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, categoryId, stock } = req.body;

  const mainImageFile = req.files.mainImage ? req.files.mainImage[0] : null;
  const supportImageFiles = req.files.supportImages
    ? req.files.supportImages
    : [];

  if (!mainImageFile || supportImageFiles.length !== 2) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: RESPONSE_MESSAGES.MISSING_IMAGES,
    });
  }

  // Upload images using uploadService
  const { mainImageUrl, supportImageUrls } =
    await uploadService.uploadProductImages(mainImageFile, supportImageFiles);

  // Check if all required fields are provided
  if (!name || !price || !categoryId || !stock) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: RESPONSE_MESSAGES.MISSING_REQUIRED_FIELDS });
  }

  // Check if a product with the same name already exists
  const existingProduct = await Product.findOne({ name });
  if (existingProduct) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: RESPONSE_MESSAGES.PRODUCT_EXISTS });
  }

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

  // Respond with the created product
  res.redirect('/admin/products');
});

// Unlist Product
const toggleProductStatus = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  // Find the product by ID
  const product = await Product.findById(productId);

  if (!product) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error(RESPONSE_MESSAGES.PRODUCT_NOT_FOUND);
  }

  // Toggle the isActive field
  product.isActive = !product.isActive;

  // Save the updated product
  await product.save();

  // Redirect back to the product management page
  res.redirect('/admin/products');
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

  res.redirect('/admin/products/');
});

module.exports = {
  getProducts,
  addProduct,
  toggleProductStatus,
  getProductById,
  updateProduct,
};

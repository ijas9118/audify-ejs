const Product = require("../models/products");
const Category = require("../models/categories");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");

// Render Product Management Page
exports.getProducts = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  const products = await Product.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: "$categoryDetails",
    },
  ]);

  res.render("layout", {
    title: "Product Management",
    viewName: "admin/productManagement",
    activePage: "products",
    isAdmin: true,
    products,
    categories,
  });
});

// Add new product
exports.addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, categoryId, stock } = req.body;

  const mainImageFile = req.files["mainImage"]
    ? req.files["mainImage"][0]
    : null;
  const supportImageFiles = req.files["supportImages"]
    ? req.files["supportImages"]
    : [];

  if (!mainImageFile || supportImageFiles.length !== 2) {
    return res.status(400).json({
      message: "Please provide exactly one main image and two support images.",
    });
  }

  const uploadPromises = [
    // Upload main image
    new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "products", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        )
        .end(mainImageFile.buffer);
    }),

    // Upload support images
    ...supportImageFiles.map((file) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "products", resource_type: "image" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          )
          .end(file.buffer);
      });
    }),
  ];

  const imageUrls = await Promise.all(uploadPromises);

  const [mainImageUrl, ...supportImageUrls] = imageUrls;

  // Check if all required fields are provided
  if (!name || !price || !categoryId || !stock) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  // Check if a product with the same name already exists
  const existingProduct = await Product.findOne({ name });
  if (existingProduct) {
    return res
      .status(400)
      .json({ message: "Product with this name already exists" });
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
  const createdProduct = await product.save();

  // Respond with the created product
  res.redirect("/admin/products");
});

// Unlist Product
exports.toggleProductStatus = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  // Find the product by ID
  const product = await Product.findById(productId);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Toggle the isActive field
  product.isActive = !product.isActive;

  // Save the updated product
  await product.save();

  // Redirect back to the product management page
  res.redirect("/admin/products");
});

// Get product for editing
exports.getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch product details
  const product = await Product.findById(id).populate("categoryId");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Fetch categories for the dropdown
  const categories = await Category.find();

  // Render the edit page with product details and categories
  res.render("layout", {
    title: "Edit Product",
    viewName: "admin/editProduct",
    activePage: "products",
    isAdmin: true,
    product,
    categories,
  });
});

// Update product
exports.updateProduct = asyncHandler(async (req, res) => {
  const { name, price, categoryId, stock, description } = req.body;
  const productId = req.params.id;

  let product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Handle image upload if new images are provided
  const uploadPromises = [];
  let updatedImages = { ...product.images };

  if (req.files["mainImage"] && req.files["mainImage"].length > 0) {
    const mainImageFile = req.files["mainImage"][0];
    uploadPromises.push(
      new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "products", resource_type: "image" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          )
          .end(mainImageFile.buffer);
      })
    );
  }

  if (req.files["supportImages"] && req.files["supportImages"].length > 0) {
    const supportImageFiles = req.files["supportImages"];
    supportImageFiles.forEach((file) => {
      uploadPromises.push(
        new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { folder: "products", resource_type: "image" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              }
            )
            .end(file.buffer);
        })
      );
    });
  }

  const imageUrls = await Promise.all(uploadPromises);

  if (req.files["mainImage"] && req.files["mainImage"].length > 0) {
    updatedImages.main = imageUrls.shift(); // Get the first URL for the main image
  }

  if (req.files["supportImages"] && req.files["supportImages"].length > 0) {
    updatedImages.supports = imageUrls; // The rest are support images
  }

  // Update product details
  product.name = name;
  product.price = price;
  product.categoryId = categoryId;
  product.stock = stock ? stock : 0;
  product.isOutOfStock = !stock;
  product.description = description;
  product.images = updatedImages;

  await product.save();

  res.redirect("/admin/products/");
});


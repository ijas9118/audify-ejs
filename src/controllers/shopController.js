const asyncHandler = require('express-async-handler');
const Product = require('../models/products');
const Offer = require('../models/offer');
const User = require('../models/userModel');
const { calculateDiscountedPrice } = require('../services/offerService');

exports.getShop = asyncHandler(async (req, res) => {
  const category = '';
  const minPrice = 200;
  const maxPrice = 5000;
  const sortBy = '';
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
    {
      $match: {
        'categoryDetails.isActive': true, // Only include products where the associated category is active
        isActive: true,
      },
    },
    {
      $lookup: {
        from: 'offers',
        localField: 'offerId', // Lookup for product-specific offer
        foreignField: '_id',
        as: 'productOfferDetails',
      },
    },
    {
      $unwind: {
        path: '$productOfferDetails',
        preserveNullAndEmptyArrays: true, // Include products without a product-specific offer
      },
    },
    {
      $lookup: {
        from: 'offers',
        localField: 'categoryDetails.offerId', // Lookup for category-specific offer
        foreignField: '_id',
        as: 'categoryOfferDetails',
      },
    },
    {
      $unwind: {
        path: '$categoryOfferDetails',
        preserveNullAndEmptyArrays: true, // Include categories without a category-wide offer
      },
    },
  ]);

  const productsWithDiscounts = products.map((product) => {
    // Get the offers (if they exist)
    const productOffer = product.productOfferDetails || null;
    const categoryOffer = product.categoryOfferDetails || null;

    // Calculate the best discounted price
    const discountedPrice = calculateDiscountedPrice(
      product.price,
      productOffer,
      categoryOffer
    );

    // Return the product along with the calculated discounted price
    return {
      ...product,
      discountedPrice, // Add the discounted price
    };
  });

  res.render('layout', {
    title: 'Audify',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/shop',
    activePage: 'shop',
    isAdmin: false,
    products: productsWithDiscounts,
    category,
    minPrice,
    maxPrice,
    sortBy,
  });
});

exports.filterShop = asyncHandler(async (req, res) => {
  const sortBy = req.body.sort;
  const { category } = req.body;
  const minPrice = parseFloat(req.body.minPrice) || 0;
  const maxPrice = parseFloat(req.body.maxPrice) || Infinity;

  let sortCriteria = {};
  const matchCriteria = { 'categoryDetails.isActive': true, isActive: true };

  switch (sortBy) {
    case 'popularity':
      sortCriteria = { popularity: -1 };
      break;
    case 'price-asc':
      sortCriteria = { price: 1 };
      break;
    case 'price-desc':
      sortCriteria = { price: -1 };
      break;
    case 'rating':
      sortCriteria = { averageRatings: -1 };
      break;
    case 'featured':
      sortCriteria = { featured: -1 };
      break;
    case 'new':
      sortCriteria = { createdAt: -1 };
      break;
    case 'a-z':
      sortCriteria = { name: 1 };
      break;
    case 'z-a':
      sortCriteria = { name: -1 };
      break;
    default:
      sortCriteria = null;
      break;
  }

  if (category) {
    matchCriteria['categoryDetails.name'] = category;
  }

  if (!Number.isNaN(minPrice) && !Number.isNaN(maxPrice)) {
    matchCriteria.price = { $gte: minPrice, $lte: maxPrice };
  }

  const pipeline = [
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
    {
      $match: matchCriteria,
    },
  ];

  if (sortCriteria !== null) {
    pipeline.push({ $sort: sortCriteria });
  }

  const products = await Product.aggregate(pipeline);

  res.render('layout', {
    title: 'Audify',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/shop',
    activePage: 'shop',
    isAdmin: false,
    products,
    category,
    minPrice,
    maxPrice,
    sortBy,
  });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('categoryId');
  if (!product) {
    return res.status(404).send('Product not found');
  }

  const categoryOffer = product.categoryId.offerId
    ? await Offer.findById(product.categoryId.offerId)
    : null;

  const productOffer = product.offerId
    ? await Offer.findById(product.offerId)
    : null;

  const discountedPrice = calculateDiscountedPrice(
    product.price,
    productOffer,
    categoryOffer
  );

  const relatedProducts = await Product.find({
    categoryId: product.categoryId._id,
    _id: { $ne: product._id },
  }).populate('categoryId');

  // Calculate discounted prices for related products
  const relatedProductsWithDiscounts = await Promise.all(
    relatedProducts.map(async (relatedProduct) => {
      const relatedProductOffer = relatedProduct.offerId
        ? await Offer.findById(relatedProduct.offerId)
        : null;
      const relatedCategoryOffer = relatedProduct.categoryId.offerId
        ? await Offer.findById(relatedProduct.categoryId.offerId)
        : null;

      const relatedDiscountedPrice = calculateDiscountedPrice(
        relatedProduct.price,
        relatedProductOffer,
        relatedCategoryOffer
      );

      return {
        ...relatedProduct.toObject(),
        discountedPrice: relatedDiscountedPrice,
      };
    })
  );

  res.render('layout', {
    title: 'Audify',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/product-detail',
    activePage: 'shop',
    isAdmin: false,
    product: {
      ...product.toObject(),
      discountedPrice,
    },
    relatedProducts: relatedProductsWithDiscounts,
  });
});

exports.getStock = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Return the stock quantity
    res.json({ stock: product.stock });
  } catch (error) {
    console.error('Error fetching stock information:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

exports.getWishList = asyncHandler(async (req, res) => {
  try {
    const userId = req.session.user;

    // Check if userId exists
    if (!userId) {
      return res.status(401).send('Unauthorized'); // or redirect to login
    }

    const user = await User.findById(userId).populate('wishlist');

    const wishlist = user.wishlist.map((product) => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.images.main, // Adjust according to your schema
      description: product.description,
    }));

    // Check if user is found
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Render the view with wishlist data
    res.render('layout', {
      title: 'Wishlist',
      header: req.session.user ? 'partials/login_header' : 'partials/header',
      viewName: 'users/wishlist',
      activePage: 'Shop',
      isAdmin: false,
      wishlist,
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).send('Server error');
  }
});

exports.addToWishlist = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user;

  if (!userId || !productId) {
    return res
      .status(400)
      .json({ message: 'User ID and Product ID are required' });
  }

  try {
    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Add product to the user's wishlist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.wishlist.includes(productId)) {
      return res
        .status(400)
        .json({ message: 'Product is already in the wishlist' });
    }

    // Update the user's wishlist by adding the productId
    await User.updateOne({ _id: userId }, { $push: { wishlist: productId } });

    res
      .status(200)
      .json({ message: 'Product added to wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
});

exports.removeWishlist = asyncHandler(async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { wishlist: productId } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist successfully',
    });
  } catch (error) {
    console.error('Error removing product from wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while removing the product from wishlist',
      error: error.message,
    });
  }
});

exports.searchProducts = async (req, res) => {
  const query = req.query.query || '';

  try {
    let products;
    if (query === '') {
      products = await Product.find();
    } else {
      const regex = new RegExp(`^${query}`, 'i');
      products = await Product.find({ name: { $regex: regex } });
    }

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

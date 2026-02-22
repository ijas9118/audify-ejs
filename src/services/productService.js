const Product = require('../models/products');
const Offer = require('../models/offer');
const User = require('../models/userModel');
const Category = require('../models/categories');
const { calculateDiscountedPrice } = require('./offerService');
const { escapeRegex } = require('../utils/regex');

exports.getFilteredProducts = async ({
  category,
  minPrice = 0,
  maxPrice = Infinity,
  sortBy,
}) => {
  let sortCriteria = {};
  const matchCriteria = {
    'categoryDetails.isActive': true,
    'categoryDetails.isDeleted': { $ne: true },
    isActive: true,
  };

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

  // Ensure minPrice and maxPrice are valid numbers
  const min = Number.isNaN(parseFloat(minPrice)) ? 0 : parseFloat(minPrice);
  const max = Number.isNaN(parseFloat(maxPrice))
    ? Infinity
    : parseFloat(maxPrice);

  // ⚠ MongoDB/BSON cannot serialize Infinity — cap to a safe large number
  const safeMax = max === Infinity ? 1_000_000_000 : max;
  matchCriteria.price = { $gte: min, $lte: safeMax };

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
    // Offer lookups
    {
      $lookup: {
        from: 'offers',
        localField: 'offerId',
        foreignField: '_id',
        as: 'productOfferDetails',
      },
    },
    {
      $unwind: {
        path: '$productOfferDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'offers',
        localField: 'categoryDetails.offerId',
        foreignField: '_id',
        as: 'categoryOfferDetails',
      },
    },
    {
      $unwind: {
        path: '$categoryOfferDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (sortCriteria !== null) {
    pipeline.push({ $sort: sortCriteria });
  }

  const products = await Product.aggregate(pipeline);

  return products.map((product) => {
    const productOffer = product.productOfferDetails || null;
    const categoryOffer = product.categoryOfferDetails || null;
    const discountedPrice = calculateDiscountedPrice(
      product.price,
      productOffer,
      categoryOffer
    );
    return { ...product, discountedPrice };
  });
};

exports.getProductDetails = async (productId) => {
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  }).populate({
    path: 'categoryId',
    match: { isActive: true, isDeleted: { $ne: true } },
  });

  if (!product || !product.categoryId) return null;

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

  // Calculate discounts for related products
  // Simplified for related products to avoid N+1 queries ideally, but reusing current logic pattern
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

  return {
    product: { ...product.toObject(), discountedPrice },
    relatedProducts: relatedProductsWithDiscounts,
  };
};

exports.getStock = async (productId) => {
  const product = await Product.findById(productId);
  return product ? product.stock : null;
};

/**
 * Search products with optional category / price / sort filters applied.
 * Returns products with discountedPrice resolved so the frontend card is consistent.
 */
exports.searchProducts = async ({
  query = '',
  category = '',
  minPrice = 0,
  maxPrice = 1_000_000_000,
  sortBy = '',
  page = 1,
  limit = 12,
} = {}) => {
  let sortCriteria = null;
  switch (sortBy) {
    case 'price-asc':
      sortCriteria = { price: 1 };
      break;
    case 'price-desc':
      sortCriteria = { price: -1 };
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
    case 'popularity':
      sortCriteria = { popularity: -1 };
      break;
    default:
      break;
  }

  const min = Number.isNaN(parseFloat(minPrice)) ? 0 : parseFloat(minPrice);
  const max = Number.isNaN(parseFloat(maxPrice))
    ? 1_000_000_000
    : parseFloat(maxPrice);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 48);
  const skip = (safePage - 1) * safeLimit;

  const baseMatch = {
    isActive: true,
    'category.isActive': true,
    'category.isDeleted': { $ne: true },
    price: { $gte: min, $lte: max },
  };

  if (category) {
    baseMatch['category.name'] = category;
  }

  if (query) {
    baseMatch.$or = [
      { name: { $regex: escapeRegex(query), $options: 'i' } },
      { description: { $regex: escapeRegex(query), $options: 'i' } },
    ];
  }

  const basePipeline = [
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    { $match: baseMatch },
  ];

  const productPipeline = [
    ...basePipeline,
    {
      $lookup: {
        from: 'offers',
        localField: 'offerId',
        foreignField: '_id',
        as: 'productOfferDetails',
      },
    },
    {
      $unwind: {
        path: '$productOfferDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'offers',
        localField: 'category.offerId',
        foreignField: '_id',
        as: 'categoryOfferDetails',
      },
    },
    {
      $unwind: {
        path: '$categoryOfferDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (sortCriteria) {
    productPipeline.push({ $sort: sortCriteria });
  }
  productPipeline.push({ $skip: skip }, { $limit: safeLimit });

  const countPipeline = [...basePipeline, { $count: 'total' }];
  const [products, totalResult] = await Promise.all([
    Product.aggregate(productPipeline),
    Product.aggregate(countPipeline),
  ]);
  const total = totalResult[0]?.total || 0;

  const pagedProducts = products.map((product) => {
    const discountedPrice = calculateDiscountedPrice(
      product.price,
      product.productOfferDetails || null,
      product.categoryOfferDetails || null
    );
    return { ...product, discountedPrice };
  });

  return {
    products: pagedProducts,
    total,
    currentPage: safePage,
    pageSize: safeLimit,
    hasMore: skip + pagedProducts.length < total,
  };
};

/**
 * Return all active, non-deleted category names for the shop filter dropdown.
 */
exports.getActiveCategories = async () =>
  Category.find({ isActive: true, isDeleted: { $ne: true } })
    .select('name')
    .sort({ name: 1 });

exports.getWishlist = async (userId) =>
  User.findById(userId).populate({
    path: 'wishlist',
    populate: { path: 'categoryId' },
  });

exports.addToWishlist = async (userId, productId) => {
  const product = await Product.findById(productId).populate('categoryId');
  if (!product) throw new Error('Product not found');
  if (!product.isActive) throw new Error('This product is no longer available');
  if (!product.categoryId?.isActive)
    throw new Error('This product category is no longer available');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Use .equals() for proper MongoDB ObjectId comparison — NOT .includes()
  if (user.wishlist.some((id) => id.equals(productId))) {
    throw new Error('Product is already in your wishlist');
  }

  // $addToSet is atomic and guaranteed idempotent at the DB level
  await User.updateOne({ _id: userId }, { $addToSet: { wishlist: productId } });
  return User.findById(userId);
};

exports.removeFromWishlist = async (userId, productId) =>
  User.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: productId } },
    { new: true }
  );

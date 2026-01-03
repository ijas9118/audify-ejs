const Product = require('../models/products');
const Offer = require('../models/offer');
const User = require('../models/userModel');
const { calculateDiscountedPrice } = require('./offerService');

exports.getFilteredProducts = async ({
  category,
  minPrice = 0,
  maxPrice = Infinity,
  sortBy,
}) => {
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

  // Ensure minPrice and maxPrice are valid numbers
  const min = Number.isNaN(parseFloat(minPrice)) ? 0 : parseFloat(minPrice);
  const max = Number.isNaN(parseFloat(maxPrice))
    ? Infinity
    : parseFloat(maxPrice);

  matchCriteria.price = { $gte: min, $lte: max };

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
  const product = await Product.findById(productId).populate('categoryId');
  if (!product) return null;

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

exports.searchProducts = async (query) => {
  if (!query) return Product.find();
  const regex = new RegExp(`^${query}`, 'i');
  return Product.find({ name: { $regex: regex } });
};

exports.getWishlist = async (userId) =>
  User.findById(userId).populate('wishlist');

exports.addToWishlist = async (userId, productId) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.wishlist.includes(productId)) {
    throw new Error('Product is already in the wishlist');
  }

  await User.updateOne({ _id: userId }, { $push: { wishlist: productId } });
  // Refresh user to get updated wishlist
  return User.findById(userId);
};

exports.removeFromWishlist = async (userId, productId) =>
  User.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: productId } },
    { new: true }
  );

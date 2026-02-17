const Offer = require('../models/offer');
const Product = require('../models/products');
const Category = require('../models/categories');
const { getPaginationMeta } = require('../utils/pagination');
const { escapeRegex } = require('../utils/regex');

const MIN_LIMIT = 5;
const MAX_LIMIT = 15;

const applyOffer = (price, offer) => {
  if (!offer) return price;

  const now = new Date();
  if (
    now < offer.validFrom ||
    now > offer.validUntil ||
    offer.status !== 'active'
  ) {
    return price;
  }

  let discountAmount = 0;

  if (offer.discountType === 'percentage') {
    discountAmount = (price * offer.discountValue) / 100;
  } else if (offer.discountType === 'fixed') {
    discountAmount = offer.discountValue;
  }

  if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
    discountAmount = offer.maxDiscountAmount;
  }

  return price - discountAmount;
};

const calculateDiscountedPrice = (
  productPrice,
  productOffer,
  categoryOffer
) => {
  const productDiscountedPrice = applyOffer(productPrice, productOffer);
  const categoryDiscountedPrice = applyOffer(productPrice, categoryOffer);

  return Math.min(productDiscountedPrice, categoryDiscountedPrice);
};

const buildSearchRegex = (search) => {
  const query = (search || '').trim();

  if (!query) {
    return null;
  }

  return {
    $regex: escapeRegex(query),
    $options: 'i',
  };
};

exports.getPaginatedOffers = async ({ page, limit, search }) => {
  const regex = buildSearchRegex(search);
  const matchStage = regex
    ? {
        $or: [
          { type: regex },
          { discountType: regex },
          { status: regex },
          { 'product.name': regex },
          { 'category.name': regex },
        ],
      }
    : {};

  const countPipeline = [
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
    { $count: 'total' },
  ];

  const countResult = await Offer.aggregate(countPipeline);
  const total = countResult.length ? countResult[0].total : 0;

  const pagination = getPaginationMeta({
    total,
    page,
    limit,
    minLimit: MIN_LIMIT,
    maxLimit: MAX_LIMIT,
  });

  const offers = await Offer.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
    { $sort: { _id: -1 } },
    { $skip: pagination.skip },
    { $limit: pagination.limit },
  ]);

  return {
    offers,
    pagination,
    search: (search || '').trim(),
  };
};

exports.createOffer = async (offerData) => {
  const {
    type,
    product,
    category,
    discountType,
    discountValue,
    maxDiscountAmount,
    minCartValue,
    validFrom,
    validUntil,
    referralBonus,
  } = offerData;

  if (!type || !discountType || !discountValue || !validFrom || !validUntil) {
    throw new Error('Missing required fields');
  }

  const newOffer = new Offer({
    type,
    product: type === 'product' ? product : undefined,
    category: type === 'category' ? category : undefined,
    discountType,
    discountValue,
    maxDiscountAmount,
    minCartValue,
    validFrom,
    validUntil,
    referralBonus: type === 'referral' ? referralBonus : undefined,
  });

  await newOffer.save();

  if (type === 'product' && product) {
    await Product.findByIdAndUpdate(product, {
      $set: { offerId: newOffer._id },
    });
  }
  if (type === 'category' && category) {
    await Category.findByIdAndUpdate(category, {
      $set: { offerId: newOffer._id },
    });
  }

  return newOffer;
};

exports.updateOfferById = async (offerId, offerData) => {
  const offer = await Offer.findById(offerId);

  if (!offer) {
    throw new Error('Offer not found');
  }

  const {
    type,
    discountType,
    discountValue,
    maxDiscountAmount,
    validFrom,
    validUntil,
    minCartValue,
  } = offerData;

  offer.type = type || offer.type;
  offer.discountType = discountType || offer.discountType;
  offer.discountValue = discountValue || offer.discountValue;
  offer.maxDiscountAmount = maxDiscountAmount || offer.maxDiscountAmount;
  offer.validFrom = validFrom || offer.validFrom;
  offer.validUntil = validUntil || offer.validUntil;
  offer.minCartValue = minCartValue || offer.minCartValue;

  await offer.save();
  return offer;
};

exports.deleteOfferById = async (offerId) => {
  const offer = await Offer.findById(offerId);

  if (!offer) {
    throw new Error('Offer not found');
  }

  await Offer.deleteOne({ _id: offerId });
  return offer;
};

exports.toggleOfferStatusById = async (offerId) => {
  const offer = await Offer.findById(offerId);

  if (!offer) {
    throw new Error('Offer not found');
  }

  offer.status = offer.status === 'active' ? 'expired' : 'active';
  await offer.save();

  return offer;
};

exports.getOfferCategories = async () => Category.find({});
exports.getOfferProducts = async () => Product.find({});

exports.calculateDiscountedPrice = calculateDiscountedPrice;

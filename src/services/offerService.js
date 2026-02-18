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

  const startDate = new Date(validFrom);
  const endDate = new Date(validUntil);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid offer date range');
  }
  if (endDate < startDate) {
    throw new Error('Valid until date must be after valid from date');
  }

  const newOffer = new Offer({
    type,
    product: type === 'product' ? product : undefined,
    category: type === 'category' ? category : undefined,
    discountType,
    discountValue,
    maxDiscountAmount,
    minCartValue,
    validFrom: startDate,
    validUntil: endDate,
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

exports.getOfferById = async (offerId) => {
  const offer = await Offer.findById(offerId)
    .populate('product', 'name')
    .populate('category', 'name');
  if (!offer) {
    throw new Error('Offer not found');
  }
  return offer;
};

exports.updateOfferById = async (offerId, offerData) => {
  const offer = await Offer.findById(offerId);

  if (!offer) {
    throw new Error('Offer not found');
  }

  const {
    type,
    product,
    category,
    discountType,
    discountValue,
    maxDiscountAmount,
    validFrom,
    validUntil,
    minCartValue,
  } = offerData;

  const nextType = type !== undefined ? type : offer.type;
  offer.type = nextType;
  offer.discountType =
    discountType !== undefined ? discountType : offer.discountType;
  offer.discountValue =
    discountValue !== undefined ? discountValue : offer.discountValue;
  offer.maxDiscountAmount =
    maxDiscountAmount !== undefined
      ? maxDiscountAmount
      : offer.maxDiscountAmount;
  const nextValidFrom =
    validFrom !== undefined ? new Date(validFrom) : offer.validFrom;
  const nextValidUntil =
    validUntil !== undefined ? new Date(validUntil) : offer.validUntil;

  if (
    Number.isNaN(new Date(nextValidFrom).getTime()) ||
    Number.isNaN(new Date(nextValidUntil).getTime())
  ) {
    throw new Error('Invalid offer date range');
  }

  offer.validFrom = nextValidFrom;
  offer.validUntil = nextValidUntil;
  offer.minCartValue =
    minCartValue !== undefined ? minCartValue : offer.minCartValue;

  if (nextType === 'product') {
    const nextProduct = product !== undefined ? product : offer.product;
    if (!nextProduct) {
      throw new Error('Product is required for product offer');
    }
    offer.product = nextProduct;
    offer.category = undefined;
  } else if (nextType === 'category') {
    const nextCategory = category !== undefined ? category : offer.category;
    if (!nextCategory) {
      throw new Error('Category is required for category offer');
    }
    offer.category = nextCategory;
    offer.product = undefined;
  } else {
    offer.product = undefined;
    offer.category = undefined;
  }

  if (offer.validUntil < offer.validFrom) {
    throw new Error('Valid until date must be after valid from date');
  }

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

const asyncHandler = require('express-async-handler');
const Offer = require('../../models/offer');
const Product = require('../../models/products');
const Category = require('../../models/categories');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  Offer Management Controllers
// ============================

// Render Offer Management Page
const getOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find().populate('product').populate('category');
  res.render('layout', {
    title: 'Offer Management',
    viewName: 'admin/offerManagement',
    activePage: 'offer',
    isAdmin: true,
    offers,
  });
});

const addOffer = asyncHandler(async (req, res) => {
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
  } = req.body;

  // Validate required fields
  if (!type || !discountType || !discountValue || !validFrom || !validUntil) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: RESPONSE_MESSAGES.MISSING_REQUIRED_FIELDS,
    });
  }

  // Create a new offer document
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

  // Save the offer to the database
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

  // Send a success response
  res
    .status(StatusCodes.CREATED)
    .json({ success: true, message: RESPONSE_MESSAGES.OFFER_ADDED });
});

const updateOffer = asyncHandler(async (req, res) => {
  const { id } = req.params; // The offer ID
  const {
    type,
    discountType,
    discountValue,
    maxDiscountAmount,
    validFrom,
    validUntil,
    minCartValue,
  } = req.body;

  // Find the offer by ID
  const offer = await Offer.findById(id);

  if (!offer) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: RESPONSE_MESSAGES.OFFER_NOT_FOUND });
  }

  // Update the offer details
  offer.type = type || offer.type;
  offer.discountType = discountType || offer.discountType;
  offer.discountValue = discountValue || offer.discountValue;
  offer.maxDiscountAmount = maxDiscountAmount || offer.maxDiscountAmount;
  offer.validFrom = validFrom || offer.validFrom;
  offer.validUntil = validUntil || offer.validUntil;
  offer.minCartValue = minCartValue || offer.minCartValue;

  // Save the updated offer
  await offer.save();

  // Send success response
  res.status(StatusCodes.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.OFFER_UPDATED,
    offer,
  });
});

const deleteOffer = asyncHandler(async (req, res) => {
  const offerId = req.params.id;

  const offer = await Offer.findById(offerId);

  if (!offer) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: RESPONSE_MESSAGES.OFFER_NOT_FOUND,
    });
  }

  await Offer.deleteOne({ _id: offerId });
  res.status(StatusCodes.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.OFFER_DELETED,
  });
});

const toggleOfferStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch the offer by id
  const offer = await Offer.findById(id);

  if (!offer) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ success: false, message: RESPONSE_MESSAGES.OFFER_NOT_FOUND });
  }

  // Toggle the status field between 'active' and 'expired'
  offer.status = offer.status === 'active' ? 'expired' : 'active';

  // Save the updated offer
  await offer.save();

  res.json({ success: true, offer });
});

// Render Deals Management Page
const getDeals = asyncHandler(async (req, res) => {
  res.render('layout', {
    title: 'Offer Management',
    viewName: 'admin/dealManagement',
    activePage: 'deal',
    isAdmin: true,
  });
});

// Get categories for offer creation
const getOfferCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  res.json(categories);
});

// Get products for offer creation
const getOfferProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});

module.exports = {
  getOffers,
  addOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getDeals,
  getOfferCategories,
  getOfferProducts,
};

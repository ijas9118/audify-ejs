const asyncHandler = require('express-async-handler');
const offerService = require('../../services/offerService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  Offer Management Controllers
// ============================

// Render Offer Management Page
const getOffers = asyncHandler(async (req, res) => {
  const { offers, pagination, search } = await offerService.getPaginatedOffers({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
  });

  res.render('layout', {
    title: 'Offer Management',
    viewName: 'admin/offerManagement',
    activePage: 'offer',
    isAdmin: true,
    offers,
    pagination,
    search,
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

  try {
    await offerService.createOffer({
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
    });

    return res
      .status(StatusCodes.CREATED)
      .json({ success: true, message: RESPONSE_MESSAGES.OFFER_ADDED });
  } catch (error) {
    if (error.message === 'Missing required fields') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: RESPONSE_MESSAGES.MISSING_REQUIRED_FIELDS,
      });
    }

    throw error;
  }
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

  let offer;

  try {
    offer = await offerService.updateOfferById(id, {
      type,
      discountType,
      discountValue,
      maxDiscountAmount,
      validFrom,
      validUntil,
      minCartValue,
    });
  } catch (error) {
    if (error.message === 'Offer not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: RESPONSE_MESSAGES.OFFER_NOT_FOUND });
    }

    throw error;
  }

  // Send success response
  return res.status(StatusCodes.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.OFFER_UPDATED,
    offer,
  });
});

const deleteOffer = asyncHandler(async (req, res) => {
  const offerId = req.params.id;

  try {
    await offerService.deleteOfferById(offerId);
  } catch (error) {
    if (error.message === 'Offer not found') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: RESPONSE_MESSAGES.OFFER_NOT_FOUND,
      });
    }

    throw error;
  }

  return res.status(StatusCodes.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.OFFER_DELETED,
  });
});

const toggleOfferStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let offer;

  try {
    offer = await offerService.toggleOfferStatusById(id);
  } catch (error) {
    if (error.message === 'Offer not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.OFFER_NOT_FOUND });
    }

    throw error;
  }

  return res.json({ success: true, offer });
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
  const categories = await offerService.getOfferCategories();
  res.json(categories);
});

// Get products for offer creation
const getOfferProducts = asyncHandler(async (req, res) => {
  const products = await offerService.getOfferProducts();
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

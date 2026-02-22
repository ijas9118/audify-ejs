const asyncHandler = require('express-async-handler');
const offerService = require('../../services/offerService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

const expectsJsonResponse = (req) =>
  req.xhr ||
  req.is('application/json') ||
  req.get('content-type')?.includes('application/json') ||
  req.get('accept')?.includes('application/json');

const getOfferEditMeta = async (offerId) => {
  const [offer, products, categories] = await Promise.all([
    offerService.getOfferById(offerId),
    offerService.getOfferProducts(),
    offerService.getOfferCategories(),
  ]);

  return { offer, products, categories };
};

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
    validFrom,
    validUntil,
  } = req.body;
  const wantsJson = expectsJsonResponse(req);

  try {
    await offerService.createOffer({
      type,
      product,
      category,
      discountType,
      discountValue,
      maxDiscountAmount,
      validFrom,
      validUntil,
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

    if (
      error.message === 'Invalid offer date range' ||
      error.message === 'Valid until date must be after valid from date'
    ) {
      if (!wantsJson) {
        return res.status(StatusCodes.BAD_REQUEST).render('layout', {
          title: 'Edit Offer',
          viewName: 'admin/editOffer',
          activePage: 'offer',
          isAdmin: true,
          offer: { _id: req.params.id },
          errors: {},
          formData: req.body,
          formError: error.message,
        });
      }
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    throw error;
  }
});

const getEditOfferPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let meta;

  try {
    meta = await getOfferEditMeta(id);
  } catch (error) {
    if (error.message === 'Offer not found') {
      return res.status(StatusCodes.NOT_FOUND).render('layout', {
        title: RESPONSE_MESSAGES.OFFER_NOT_FOUND,
        viewName: '404',
        isAdmin: true,
        activePage: 'offer',
      });
    }
    throw error;
  }

  return res.render('layout', {
    title: `Edit Offer - ${meta.offer.type}`,
    viewName: 'admin/editOffer',
    activePage: 'offer',
    isAdmin: true,
    offer: meta.offer,
    products: meta.products,
    categories: meta.categories,
    errors: {},
    formData: null,
    formError: null,
  });
});

const updateOffer = asyncHandler(async (req, res) => {
  const { id } = req.params; // The offer ID
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
  } = req.body;

  let offer;
  const wantsJson = expectsJsonResponse(req);

  try {
    offer = await offerService.updateOfferById(id, {
      type,
      product,
      category,
      discountType,
      discountValue,
      maxDiscountAmount,
      validFrom,
      validUntil,
      minCartValue,
    });
  } catch (error) {
    if (error.message === 'Offer not found') {
      if (!wantsJson) {
        return res.status(StatusCodes.NOT_FOUND).render('layout', {
          title: RESPONSE_MESSAGES.OFFER_NOT_FOUND,
          viewName: '404',
          isAdmin: true,
          activePage: 'offer',
        });
      }
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: RESPONSE_MESSAGES.OFFER_NOT_FOUND });
    }

    if (
      error.message === 'Invalid offer date range' ||
      error.message === 'Valid until date must be after valid from date' ||
      error.message === 'Product is required for product offer' ||
      error.message === 'Category is required for category offer'
    ) {
      if (!wantsJson) {
        const {
          offer: existingOffer,
          products,
          categories,
        } = await getOfferEditMeta(id);
        return res.status(StatusCodes.BAD_REQUEST).render('layout', {
          title: `Edit Offer - ${type || 'Offer'}`,
          viewName: 'admin/editOffer',
          activePage: 'offer',
          isAdmin: true,
          offer: existingOffer,
          products,
          categories,
          errors: {},
          formData: req.body,
          formError: error.message,
        });
      }
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    throw error;
  }

  if (!wantsJson) {
    return res.redirect('/admin/offers');
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
  getEditOfferPage,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getDeals,
  getOfferCategories,
  getOfferProducts,
};

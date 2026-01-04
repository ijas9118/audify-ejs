const asyncHandler = require('express-async-handler');
const productService = require('../services/productService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

const getShop = asyncHandler(async (req, res) => {
  const category = '';
  const minPrice = 200;
  const maxPrice = 5000;
  const sortBy = '';

  const products = await productService.getFilteredProducts({
    category,
    minPrice,
    maxPrice,
    sortBy,
  });

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

const filterShop = asyncHandler(async (req, res) => {
  const sortBy = req.body.sort;
  const { category } = req.body;
  const minPrice = parseFloat(req.body.minPrice) || 0;
  const maxPrice = parseFloat(req.body.maxPrice) || Infinity;

  const products = await productService.getFilteredProducts({
    category,
    minPrice,
    maxPrice,
    sortBy,
  });

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

const getProduct = asyncHandler(async (req, res) => {
  const details = await productService.getProductDetails(req.params.id);

  if (!details) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .send(RESPONSE_MESSAGES.PRODUCT_NOT_FOUND);
  }

  res.render('layout', {
    title: 'Audify',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/product-detail',
    activePage: 'shop',
    isAdmin: false,
    product: details.product,
    relatedProducts: details.relatedProducts,
  });
});

const getStock = asyncHandler(async (req, res) => {
  const { productId } = req.query;
  if (!productId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: 'Product ID is required' });
  }

  const stock = await productService.getStock(productId);
  if (stock === null) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ error: RESPONSE_MESSAGES.PRODUCT_NOT_FOUND });
  }

  res.json({ stock });
});

const getWishList = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .send(RESPONSE_MESSAGES.UNAUTHORIZED);
  }

  const user = await productService.getWishlist(userId);
  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .send(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  const wishlist = user.wishlist.map((product) => ({
    _id: product._id,
    name: product.name,
    price: product.price,
    image: product.images.main,
    description: product.description,
  }));

  res.render('layout', {
    title: 'Wishlist',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/wishlist',
    activePage: 'Shop',
    isAdmin: false,
    wishlist,
  });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user;

  if (!userId || !productId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'User ID and Product ID are required' });
  }

  const user = await productService.addToWishlist(userId, productId);
  res.status(StatusCodes.OK).json({
    message: RESPONSE_MESSAGES.PRODUCT_ADDED_TO_WISHLIST,
    wishlist: user.wishlist,
  });
});

const removeWishlist = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const productId = req.params.id;

  const updatedUser = await productService.removeFromWishlist(
    userId,
    productId
  );

  if (!updatedUser) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: RESPONSE_MESSAGES.USER_NOT_FOUND });
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: RESPONSE_MESSAGES.PRODUCT_REMOVED_FROM_WISHLIST,
  });
});

const searchProducts = asyncHandler(async (req, res) => {
  const query = req.query.query || '';
  const products = await productService.searchProducts(query);
  res.json(products);
});

module.exports = {
  getShop,
  filterShop,
  getProduct,
  getStock,
  getWishList,
  addToWishlist,
  removeWishlist,
  searchProducts,
};

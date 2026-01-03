const asyncHandler = require('express-async-handler');
const productService = require('../services/productService');

exports.getShop = asyncHandler(async (req, res) => {
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

exports.filterShop = asyncHandler(async (req, res) => {
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

exports.getProduct = asyncHandler(async (req, res) => {
  const details = await productService.getProductDetails(req.params.id);

  if (!details) {
    return res.status(404).send('Product not found');
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

exports.getStock = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.query;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const stock = await productService.getStock(productId);
    if (stock === null) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ stock });
  } catch (error) {
    console.error('Error fetching stock information:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

exports.getWishList = asyncHandler(async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    const user = await productService.getWishlist(userId);
    if (!user) {
      return res.status(404).send('User not found');
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
    const user = await productService.addToWishlist(userId, productId);
    res
      .status(200)
      .json({ message: 'Product added to wishlist', wishlist: user.wishlist });
  } catch (error) {
    if (error.message === 'Product is already in the wishlist') {
      return res.status(400).json({ message: error.message });
    }
    if (
      error.message === 'Product not found' ||
      error.message === 'User not found'
    ) {
      return res.status(404).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
});

exports.removeWishlist = asyncHandler(async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.id;

    const updatedUser = await productService.removeFromWishlist(
      userId,
      productId
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
    const products = await productService.searchProducts(query);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

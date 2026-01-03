const asyncHandler = require('express-async-handler');
const cartService = require('../services/cartService');

exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const cart = await cartService.getCart(userId);

  res.render('layout', {
    title: 'Cart',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/cart',
    activePage: 'Shop',
    isAdmin: false,
    cart,
  });
});

exports.getCartItemID = asyncHandler(async (req, res) => {
  const userId = req.session.user;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const cart = await cartService.getCartWithProductDetails(userId);

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Extract product IDs and quantities
    const products = cart.items.map((item) => ({
      productId: item.productId._id.toString(),
      quantity: item.quantity,
      name: item.name,
    }));

    // Return product IDs and quantities as response
    res.json({ products });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

exports.addToCart = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const productId = req.params.id;
  try {
    await cartService.addToCart(userId, productId, 1);
    res.status(200).json({ message: 'Item added to cart successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add item to cart' });
  }
});

exports.updateCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user;

  const cart = await cartService.addToCart(userId, productId, quantity);

  res.json(cart);
});

exports.deleteItemFromCart = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user;

  try {
    const cart = await cartService.removeItemFromCart(userId, productId);
    res.status(200).json({ message: 'Item removed successfully', cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

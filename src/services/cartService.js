const Cart = require('../models/cart');
const Product = require('../models/products');
const Offer = require('../models/offer');
const { calculateDiscountedPrice } = require('./offerService');

exports.getCart = async (userId) => Cart.findOne({ user: userId });

exports.getCartWithProductDetails = async (userId) =>
  Cart.findOne({ user: userId }).populate('items.productId');

exports.addToCart = async (userId, productId, quantity) => {
  const product = await Product.findById(productId).populate('categoryId');

  if (!product) {
    throw new Error('Product not found');
  }

  // ✅ Resolve the effective (offer-discounted) price at the time of adding to cart
  const productOffer = product.offerId
    ? await Offer.findById(product.offerId)
    : null;
  const categoryOffer = product.categoryId?.offerId
    ? await Offer.findById(product.categoryId.offerId)
    : null;
  const effectivePrice = calculateDiscountedPrice(
    product.price,
    productOffer,
    categoryOffer
  );

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [], total: 0 });
  }

  const item = cart.items.find((i) => i.productId.equals(productId));

  if (item) {
    // Update quantity but keep the already-stored discounted price
    item.quantity = quantity;
    item.subtotal = item.quantity * item.price;
  } else {
    cart.items.push({
      productId: product._id,
      name: product.name,
      image: product.images.main,
      price: effectivePrice, // ✅ discounted price
      quantity,
      subtotal: effectivePrice * quantity,
    });
  }

  cart.calculateTotals();
  await cart.save();
  return cart;
};

exports.removeItemFromCart = async (userId, productId) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new Error('Cart not found');
  }

  // Remove the item with the specified productId
  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== productId
  );

  // Save the updated cart
  cart.calculateTotals();
  return cart.save();
};

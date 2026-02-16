const Cart = require('../models/cart');
const Product = require('../models/products');

exports.getCart = async (userId) => Cart.findOne({ user: userId });

exports.getCartWithProductDetails = async (userId) =>
  Cart.findOne({ user: userId }).populate('items.productId');

exports.addToCart = async (userId, productId, quantity) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [], total: 0 });
  }

  const item = cart.items.find((i) => i.productId.equals(productId));

  if (item) {
    item.quantity = quantity;
    item.subtotal = item.quantity * item.price;
  } else {
    cart.items.push({
      productId: product._id,
      name: product.name,
      image: product.images.main,
      price: product.price,
      quantity,
      subtotal: product.price * quantity,
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

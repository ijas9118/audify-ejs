const Cart = require('../models/cart');
const Product = require('../models/products');
const Offer = require('../models/offer');
const { calculateDiscountedPrice } = require('./offerService');

const MAX_QUANTITY_PER_ITEM = 5;

exports.getCart = async (userId) => Cart.findOne({ user: userId });

exports.getCartWithProductDetails = async (userId) =>
  Cart.findOne({ user: userId }).populate('items.productId');

/**
 * Add a product to the cart (or update its quantity if it already exists).
 * Enforces:
 *  - product must exist, be active, and its category must be active
 *  - quantity must be between 1 and MAX_QUANTITY_PER_ITEM (5)
 *  - quantity must not exceed available stock
 *  - clears any applied coupon when cart contents change (quantities or new items)
 */
exports.addToCart = async (userId, productId, quantity) => {
  // ── 1. Validate & fetch product ─────────────────────────────────────────────
  const qty = parseInt(quantity, 10);
  if (!qty || qty < 1) {
    throw new Error('Quantity must be at least 1');
  }
  if (qty > MAX_QUANTITY_PER_ITEM) {
    throw new Error(`Maximum ${MAX_QUANTITY_PER_ITEM} units per item allowed`);
  }

  const product = await Product.findById(productId).populate('categoryId');

  if (!product) {
    throw new Error('Product not found');
  }
  if (!product.isActive) {
    throw new Error('This product is no longer available');
  }
  if (!product.categoryId || !product.categoryId.isActive) {
    throw new Error('This product category is no longer available');
  }
  if (product.stock <= 0 || product.isOutOfStock) {
    throw new Error('This product is out of stock');
  }
  if (qty > product.stock) {
    throw new Error(
      `Only ${product.stock} unit(s) available for "${product.name}"`
    );
  }

  // ── 2. Resolve effective (offer-discounted) price ────────────────────────────
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

  // ── 3. Find or create cart ────────────────────────────────────────────────────
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [], total: 0 });
  }

  const existingItem = cart.items.find((i) => i.productId.equals(productId));

  if (existingItem) {
    existingItem.quantity = qty;
    existingItem.subtotal = qty * existingItem.price; // keep stored discounted price
  } else {
    cart.items.push({
      productId: product._id,
      name: product.name,
      image: product.images.main,
      price: effectivePrice,
      quantity: qty,
      subtotal: effectivePrice * qty,
    });
  }

  // ── 4. Clear coupon on any quantity/item change (stale discount prevention) ──
  if (cart.appliedCoupon) {
    cart.appliedCoupon = null;
    cart.discountApplied = 0;
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

  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== productId
  );

  // If no items left, also clear the coupon so next add starts fresh
  if (cart.items.length === 0) {
    cart.appliedCoupon = null;
    cart.discountApplied = 0;
  }

  cart.calculateTotals();
  return cart.save();
};

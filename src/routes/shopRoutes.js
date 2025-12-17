const express = require("express");
const router = express.Router();
const Product = require('../models/products')
const userAuth = require("../middleware/userAuth");
const {
  getShop,
  filterShop,
  getCart,
  updateCart,
  addToCart,
  deleteItemFromCart,
  getProduct,
  getStock,
  getCartItemID,
  addToWishlist,
  getWishList,
  removeWishlist,
} = require("../controllers/userController");

router.get("/", getShop);

router.post("/", filterShop);

router.get('/search-products', async (req, res) => {
  const query = req.query.query || '';

  try {
    let products;
    if (query === '') {
      products = await Product.find();

    } else {
      const regex = new RegExp('^' + query, 'i');
      products = await Product.find({ name: { $regex: regex } });
    }

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});


router.get("/cart", userAuth, getCart);

router.get("/cart-item-id", userAuth, getCartItemID);

router.post("/cart/updateQuantity", userAuth, updateCart);

router.get("/cart/:id", userAuth, addToCart);

router.delete("/cart/:id", userAuth, deleteItemFromCart);

// Wishlist 
router.post('/wishlist/add/:id', userAuth, addToWishlist);
router.get('/wishlist', userAuth, getWishList);
router.get('/wishlist/remove/:id', userAuth, removeWishlist);

// Get the stock of a product
router.get("/stock", userAuth, getStock);

router.get("/:id", getProduct);


module.exports = router;

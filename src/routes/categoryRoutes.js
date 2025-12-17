const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const {
  getCategory,
  toggleCategoryStatus,
  deleteCategory,
  addCategory,
  updateCategory
} = require("../controllers/categoryController");

// Get all categories
router.get("/", adminAuth, getCategory);

// Add a new category
router.post("/", adminAuth, addCategory);

// Toggle category status
router.post("/toggle-status/:id", adminAuth, toggleCategoryStatus);

// Delete a category
router.post("/delete/:id", adminAuth, deleteCategory);

// Update a category
router.post('/edit/:id', adminAuth, updateCategory);

module.exports = router;

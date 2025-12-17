const Admin = require("../models/adminModel");
const User = require("../models/userModel");
const Order = require("../models/order");
const Offer = require("../models/offer");
const Product = require("../models/products");
const Category = require("../models/categories");
const Coupon = require("../models/coupon");
const asyncHandler = require("express-async-handler");
const moment = require("moment");

// ============================
//  Admin Authentication Controllers
// ============================

// Render Admin Login Page
exports.getAdminLogin = asyncHandler(async (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin");
  }
  res.render("admin/adminLogin", { title: "Admin Login" });
});

// Handle Admin Login
exports.loginAdmin = asyncHandler(async (req, res) => {
  const { user, password } = req.body;
  const findAdmin = await Admin.findOne({ user });

  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    req.session.admin = findAdmin._id;

    res.redirect("/admin");
  } else {
    throw new Error("Invalid Credentials");
  }
});

// Render Admin Home Page (Dashboard)
exports.getAdminHome = asyncHandler(async (req, res) => {
  res.render("layout", {
    title: "Audify",
    viewName: "admin/adminHome",
    activePage: "dashboard",
    isAdmin: true,
  });
});

// Handle Admin Logout
exports.logoutAdmin = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.redirect("/admin/login");
  });
});

// ============================
//  User Management Controllers
// ============================

// Render User Management Page
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();

  if (!users) {
    throw new Error("Failed to fetch users");
  }

  res.render("layout", {
    title: "User Management",
    viewName: "admin/userManagement",
    activePage: "users",
    isAdmin: true,
    users: users,
  });
});

// Toggle user status
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Find user by ID
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Determine the new status
  const newStatus = user.status === "Active" ? "Inactive" : "Active";

  // Update the status field only
  const result = await User.updateOne(
    { _id: userId },
    { $set: { status: newStatus } }
  );

  // Check if the update was successful
  if (result.modifiedCount === 0) {
    res.status(404);
    throw new Error("User not found or status not changed");
  }

  // Redirect back to user management page
  res.redirect("/admin/users");
});

// ============================
//  Order Management Controllers
// ============================

// Render Order Management Page
exports.getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ dateOrdered: -1 });

  res.render("layout", {
    title: "Order Management",
    viewName: "admin/orderManagement",
    activePage: "orders",
    isAdmin: true,
    orders,
  });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const status = req.body.status;
  try {
    const updatedOrder = await Order.updateOne(
      { _id: orderId },
      { $set: { status } }
    );

    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

exports.viewOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await Order.findById({ _id: orderId })
    .populate("user", "firstName lastName email mobile")
    .populate({ path: "orderItems", populate: "product" });

  res.render("layout", {
    title: "Order Management",
    viewName: "admin/viewOrder",
    activePage: "orders",
    isAdmin: true,
    order,
  });
});

// ============================
//  Coupon Management Controllers
// ============================

// Render Coupon Management Page
exports.getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find();
  res.render("layout", {
    title: "Coupon Management",
    viewName: "admin/couponManagement",
    activePage: "coupon",
    isAdmin: true,
    coupons,
  });
});

exports.addCoupon = asyncHandler(async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      maxDiscountValue,
      minCartValue,
      validFrom, // Changed from expirationDate
      validUntil, // New field for expiration date
      usageLimit,
      isActive,
    } = req.body;

    // Validate required fields
    if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const existingCoupon = await Coupon.findOne({ code });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "A coupon with this code already exists",
      });
    }

    // Create a new coupon document
    const newCoupon = new Coupon({
      code,
      discountType,
      discountValue,
      maxDiscountValue,
      minCartValue: minCartValue || 0, // Default to 0 if not provided
      validFrom, // New field for start date
      validUntil, // New field for expiration date
      usageLimit: usageLimit || 1, // Default to 1 if not provided
      isActive: isActive !== undefined ? isActive : true, // Default to true if not provided
    });

    // Save the coupon to the database
    await newCoupon.save();

    // Send a success response
    res
      .status(201)
      .json({ success: true, message: "Coupon added successfully!" });
  } catch (error) {
    console.error("Error adding coupon:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while adding the coupon",
    });
  }
});

exports.updateCoupon = async (req, res) => {
  const { id } = req.params;
  const {
    code,
    discountType,
    discountValue,
    maxDiscountValue,
    minCartValue,
    validFrom,
    validUntil,
    usageLimit,
    isActive,
  } = req.body;

  try {
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    coupon.code = code || coupon.code;
    coupon.discountType = discountType || coupon.discountType;
    coupon.discountValue = discountValue || coupon.discountValue;
    coupon.maxDiscountValue = maxDiscountValue;
    coupon.minCartValue = minCartValue;
    coupon.validFrom = validFrom || coupon.validFrom;
    coupon.validUntil = validUntil || coupon.validUntil;
    coupon.usageLimit = usageLimit || coupon.usageLimit;
    coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;
    await coupon.save();

    res
      .status(200)
      .json({ success: true, message: "Coupon updated successfully", coupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;

    const result = await Coupon.findByIdAndDelete(couponId);

    if (!result) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res
      .status(500)
      .json({ message: "An error occurred while deleting the coupon" });
  }
};

exports.toggleCouponStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findById(id);
    
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    coupon.isActive = !coupon.isActive;

    await coupon.save();

    res.json({ success: true, message: "Coupon status updated", coupon });
  } catch (error) {
    console.error("Error updating coupon status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
})

// ============================
//  Offer Management Controllers
// ============================

// Render Offer Management Page
exports.getOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find().populate("product").populate("category");
  res.render("layout", {
    title: "Offer Management",
    viewName: "admin/offerManagement",
    activePage: "offer",
    isAdmin: true,
    offers,
  });
});

exports.addOffer = asyncHandler(async (req, res) => {
  try {
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

    // Validate required fields
    if (!type || !discountType || !discountValue || !validFrom || !validUntil) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Create a new offer document
    const newOffer = new Offer({
      type,
      product: type === "product" ? product : undefined,
      category: type === "category" ? category : undefined,
      discountType,
      discountValue,
      maxDiscountAmount,
      minCartValue,
      validFrom,
      validUntil,
      referralBonus: type === "referral" ? referralBonus : undefined,
    });

    // Save the offer to the database
    await newOffer.save();

    if (type === "product" && product) {
      await Product.findByIdAndUpdate(product, {
        $set: { offerId: newOffer._id },
      });
    }
    if (type === "category" && category) {
      await Category.findByIdAndUpdate(category, {
        $set: { offerId: newOffer._id },
      });
    }

    // Send a success response
    res
      .status(201)
      .json({ success: true, message: "Offer added successfully!" });
  } catch (error) {
    console.error("Error adding offer:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while adding the offer",
    });
  }
});

exports.updateOffer = async (req, res) => {
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

  try {
    // Find the offer by ID
    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // Update the offer details
    offer.type = type || offer.type;
    offer.discountType = discountType || offer.discountType;
    offer.discountValue = discountValue || offer.discountValue;
    offer.maxDiscountAmount = maxDiscountAmount || offer.maxDiscountAmount;
    offer.validFrom = validFrom || offer.validFrom;
    offer.validUntil = validUntil || offer.validUntil;
    offer.minCartValue = minCartValue || offer.minCartValue;

    // Save the updated offer
    await offer.save();

    // Send success response
    res
      .status(200)
      .json({ success: true, message: "Offer updated successfully", offer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteOffer = asyncHandler(async (req, res) => {
  const offerId = req.params.id;

  try {
    const offer = await Offer.findById(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    await Offer.deleteOne({ _id: offerId });
    res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the offer",
    });
  }
});

exports.toggleOfferStatus = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the offer by id
    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    // Toggle the status field between 'active' and 'expired'
    offer.status = offer.status === 'active' ? 'expired' : 'active';

    // Save the updated offer
    await offer.save();

    res.json({ success: true, offer });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// ============================
//  Deals Management Controllers
// ============================

// Render Deals Management Page
exports.getDeals = asyncHandler(async (req, res) => {
  res.render("layout", {
    title: "Offer Management",
    viewName: "admin/dealManagement",
    activePage: "deal",
    isAdmin: true,
  });
});

// ============================
//  Sales Report Controllers
// ============================

const getDateRange = (filterType) => {
  const today = moment().startOf("day");

  switch (filterType) {
    case "Daily":
      return {
        start: today.clone(), // Clone to avoid mutation
        end: today.clone().endOf("day"),
      };
    case "Weekly":
      return {
        start: today.clone().startOf("week"),
        end: today.clone().endOf("week"),
      };
    case "Monthly":
      return {
        start: today.clone().startOf("month"),
        end: today.clone().endOf("month"),
      };
    case "Yearly":
      return {
        start: today.clone().startOf("year"),
        end: today.clone().endOf("year"),
      };
    default:
      return { start: null, end: null };
  }
};

exports.getSalesReport = asyncHandler(async (req, res) => {
  const { filter, startDate, endDate } = req.body;
  let start, end;

  // Determine date range
  if (filter === "Custom Date Range" && startDate && endDate) {
    start = moment(startDate).startOf("day");
    end = moment(endDate).endOf("day");
  } else {
    const dateRange = getDateRange(filter); // Ensure this function is defined
    start = dateRange.start;
    end = dateRange.end;
  }

  try {
    // Fetch orders within the date range, excluding cancelled ones
    const orders = await Order.find({
      dateOrdered: { $gte: start.toDate(), $lte: end.toDate() },
      isCancelled: false, // Exclude cancelled orders
    }).populate({
      path: 'orderItems',
      populate: {
        path: 'product',
        select: 'price', // Select only the fields you need
      },
    });

    // Process sales data
    const salesData = orders.reduce((acc, order) => {
      const dateKey = moment(order.dateOrdered).format("YYYY-MM-DD");
      if (!acc[dateKey]) {
        acc[dateKey] = {
          totalSalesRevenue: 0,
          discountApplied: 0,
          netSales: 0,
          numberOfOrders: 0,
          totalItemsSold: 0,
        };
      }

      // Use the discount applied field directly from the order
      const discountApplied = order.discountApplied; // Already provided in the order model

      // Calculate total sales revenue including shipping charge
      acc[dateKey].totalSalesRevenue += order.totalAmount;
      acc[dateKey].discountApplied += discountApplied;
      acc[dateKey].netSales += order.finalTotal; // Use finalTotal for net sales
      acc[dateKey].numberOfOrders += 1;
      acc[dateKey].totalItemsSold += order.orderItems.length;

      return acc;
    }, {});

    // Transform sales data into an array
    const responseData = Object.keys(salesData).map((date) => ({
      date,
      ...salesData[date],
    }));

    // Summary calculations
    const totalSalesCount = orders.length; // Count of non-cancelled orders
    const overallOrderAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // Total discount applied considering only successful orders
    const overallDiscount = orders.reduce(
      (sum, order) => sum + order.discountApplied,
      0
    );

    res.json({
      success: true,
      data: responseData,
      summary: {
        totalSalesCount,
        overallOrderAmount,
        overallDiscount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

exports.getSalesData = async (req, res) => {
  try {
    const filter = req.query.filter || "Monthly";
    let match = {};
    let groupId = null;

    const today = new Date();

    switch (filter) {
      case "Daily":
        // Last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);

        match = {
          dateOrdered: {
            $gte: sevenDaysAgo,
            $lte: today,
          },
        };

        groupId = {
          $dateToString: { format: "%Y-%m-%d", date: "$dateOrdered" },
        };
        break;

      case "Weekly":
        // Last 4 weeks
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(today.getDate() - 28);

        match = {
          dateOrdered: {
            $gte: fourWeeksAgo,
            $lte: today,
          },
        };

        groupId = {
          week: { $isoWeek: "$dateOrdered" },
          year: { $isoWeekYear: "$dateOrdered" },
        };
        break;

      case "Monthly":
        // Last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(today.getMonth() - 11);

        match = {
          dateOrdered: {
            $gte: twelveMonthsAgo,
            $lte: today,
          },
        };

        groupId = {
          $dateToString: { format: "%Y-%m", date: "$dateOrdered" },
        };
        break;

      case "Yearly":
        // Last 5 years
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(today.getFullYear() - 4);

        match = {
          dateOrdered: {
            $gte: fiveYearsAgo,
            $lte: today,
          },
        };

        groupId = {
          $dateToString: { format: "%Y", date: "$dateOrdered" },
        };
        break;

      case "Custom Date Range":
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);

        if (isNaN(startDate) || isNaN(endDate)) {
          return res.status(400).json({ message: "Invalid date range" });
        }

        match = {
          dateOrdered: {
            $gte: startDate,
            $lte: endDate,
          },
        };

        groupId = {
          $dateToString: { format: "%Y-%m-%d", date: "$dateOrdered" },
        };
        break;

      default:
        // Default to Monthly
        const defaultMonthsAgo = new Date();
        defaultMonthsAgo.setMonth(today.getMonth() - 11);

        match = {
          dateOrdered: {
            $gte: defaultMonthsAgo,
            $lte: today,
          },
        };

        groupId = {
          $dateToString: { format: "%Y-%m", date: "$dateOrdered" },
        };
        break;
    }

    // Aggregation pipeline
    const salesData = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupId,
          totalSales: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Prepare data for the chart
    let labels = [];
    let values = [];

    if (filter === "Weekly") {
      // Handle weekly data
      labels = salesData.map(
        (data) => `Week ${data._id.week} (${data._id.year})`
      );
    } else {
      labels = salesData.map((data) => data._id);
    }

    values = salesData.map((data) => data.totalSales);

    res.json({ labels, values });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getBestSellers = async (req, res) => {
  try {
    // Fetch top 10 best-selling products
    const topProducts = await Product.find({ isActive: true })
      .sort({ popularity: -1 })
      .limit(10)
      .select('name images.main popularity');

    // Fetch top 3 best-selling categories
    const topCategories = await Category.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "categoryId",
          as: "products",
        },
      },
      {
        $project: {
          name: 1,
          popularity: { $sum: "$products.popularity" },
        },
      },
      {
        $sort: { popularity: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    res.status(200).json({
      topProducts: topProducts.map(product => ({
        name: product.name,
        image: product.images.main,
        popularity: product.popularity,
      })),
      topCategories: topCategories.map(category => ({
        name: category.name,
        popularity: category.popularity || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching best sellers:', error);
    res.status(500).json({ error: 'Failed to fetch best sellers' });
  }
};
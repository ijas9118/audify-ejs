const Address = require("../models/address");
const Cart = require("../models/cart");
const OrderItem = require("../models/orderItem");
const Order = require("../models/order");
const Product = require("../models/products");
const Coupon = require("../models/coupon");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const Razorpay = require("razorpay");

exports.getCheckoutPage = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const cart = await Cart.findOne({ user: userId });
  const addresses = await Address.find({ user: userId });
  res.render("layout", {
    title: "Checkout",
    header: req.session.user ? "partials/login_header" : "partials/header",
    viewName: "users/checkout",
    activePage: "Shop",
    isAdmin: false,
    cart,
    addresses,
  });
});

exports.applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode, cartId } = req.body;

  try {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired coupon code" });
    }

    const currentDate = new Date();
    if (currentDate < coupon.validFrom || currentDate > coupon.validUntil) {
      return res.status(400).json({
        success: false,
        message: `Coupon ${couponCode} is not valid at this time.`,
      });
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = parseFloat(((coupon.discountValue / 100) * cart.total).toFixed(2));
      if (coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
        discount = coupon.maxDiscountValue;
      }
    } else if (coupon.discountType === "fixed") {
      discount = coupon.discountValue;
    }

    if (cart.appliedCoupon) {
      return res.status(400).json({
        success: false,
        message: "A coupon has already been applied to this cart.",
      });
    }

    let finalTotal = cart.total - discount;

    await Cart.updateOne(
      { _id: cartId },
      {
        $set: {
          appliedCoupon: coupon.code,
          discountApplied: discount,
          finalTotal,
        },
      }
    );

    res.json({
      success: true,
      message: `Coupon ${couponCode} applied successfully.`,
      finalTotal,
      appliedCoupon: cart.appliedCoupon,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while applying the coupon",
    });
  }
});

exports.removeCoupon = asyncHandler(async (req, res) => {
  const cartId = req.params.cartId;
  try {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    if (!cart.appliedCoupon) {
      return res
        .status(400)
        .json({ success: false, message: "No coupon applied to this cart." });
    }

    cart.appliedCoupon = null;
    cart.discountApplied = 0;

    cart.calculateTotals();

    await Cart.updateOne(
      { _id: cartId },
      {
        $set: {
          appliedCoupon: cart.appliedCoupon,
          discountApplied: cart.discountApplied,
          finalTotal: cart.finalTotal,
        },
      }
    );

    res.json({
      success: true,
      message: "Coupon removed successfully",
      finalTotal: cart.finalTotal,
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while removing the coupon",
    });
  }
});

exports.razorPay = asyncHandler(async (req, res) => {
  try {
    const orderData = await Order.findById(req.params.id)
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const options = req.body;
    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).send("Error");
    }

    res.status(200).json({order, orderData});
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

exports.confirmPayment = asyncHandler(async (req, res) => {
  const orderId = req.body.orderId;
  const paymentMethod = req.body.paymentMethod;
  const order = await Order.findById(orderId)
  if (!order) {
    return res.status(404).json({success: false, message: "Order not found!"});
  }

  if (paymentMethod === 'COD') {
    if (order.finalTotal > 1000) {
      return res.status(400).json({
        success: false,
        message: "Cash on Delivery is not available for orders above ₹1000."
      });
    }
  }

  order.paymentMethod = paymentMethod;
  order.status = "Processed";

  await order.save();
  res.status(200).json({
    success: true,
    message: "Payment confirmed, order updated successfully",
    order,
  });
})

exports.walletPayment = asyncHandler(async (req, res) => {
  const orderId = req.body.orderId;
  const userId = req.session.user;

  try {
    // Find the user and their wallet balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found!" });
    }

    // Check if the wallet balance is sufficient
    if (user.walletBalance < order.finalTotal) {
      return res.status(400).json({ 
        success: false, 
        message: "Insufficient wallet balance. Please use a different payment method."
      });
    }

    // Deduct the order amount from the wallet
    const updatedWalletBalance = parseFloat((user.walletBalance - order.finalTotal).toFixed(2));

    // Update the order status and payment method
    order.paymentMethod = "Wallet";
    order.status = "Processed";

    // Save the updated user and order
    await User.updateOne(
      { _id: userId },
      { 
        $set: { walletBalance: updatedWalletBalance },
        $push: { walletTransactions: { transactionType: "Debit", amount: order.finalTotal, description: `Payment for Order ID: ${orderId}`, date: new Date() }}
      }
    );
    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment confirmed using wallet, order updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error processing wallet payment ${error.message}`,
      error: error.message,
    });
  }
});


exports.placeOrder = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const {
    name,
    mobile,
    alternateMobile,
    location,
    city,
    state,
    landmark,
    zip,
  } = req.body;

  try {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(400).json({ message: "Cart not found" });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const orderItem = new OrderItem({
          quantity: item.quantity,
          product: item.productId,
        });
        await orderItem.save();

        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        const updatedStock = product.stock - item.quantity;
        const isOutOfStock = updatedStock <= 0;

        await Product.findByIdAndUpdate(
          item.productId,
          {
            $inc: { stock: -item.quantity, popularity: 1 },
            $set: { isOutOfStock },
          } // Decrement stock by the ordered quantity
        );

        return orderItem;
      })
    );

    const order = new Order({
      user: userId,
      name,
      mobile,
      alternateMobile,
      location,
      city,
      state,
      landmark,
      zip,
      orderItems: orderItems.map((item) => item._id),
      shippingCharge: cart.shippingCharge,
      totalAmount: cart.total, 
      discountApplied: cart.discountApplied,
      finalTotal: cart.finalTotal, 
      appliedCoupon: cart.appliedCoupon || null,
      paymentMethod: null, 
    });

    const placedOrder = await order.save();

    await Cart.deleteOne({ user: userId });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      orderId: placedOrder._id,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error placing the order", error: error.message });
  }
});

exports.paymentSelection = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId).populate({
      path: "orderItems",
      populate: {
        path: "product",
      },
    });
    
    const user = await User.findById(req.session.user).select('walletBalance');

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("layout", {
      title: "Checkout",
      header: req.session.user ? "partials/login_header" : "partials/header",
      viewName: "users/payment",
      activePage: "Shop",
      isAdmin: false,
      order,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    res.status(500).send("Error fetching order");
  }
})

exports.orderSuccessPage = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate({
        path: "orderItems",
        populate: {
          path: "product",
          select: "name price",
        },
      })
      .exec();

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("layout", {
      title: "Order Success",
      header: req.session.user ? "partials/login_header" : "partials/header",
      viewName: "users/orderSuccess",
      activePage: "Order",
      isAdmin: false,
      order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("Server Error");
  }
});

exports.getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.session.user;

  const orders = await Order.find({ user: userId })
    .populate({ path: "orderItems", populate: "product" })
    .sort({ dateOrdered: -1 });

  res.render("layout", {
    title: "Order History",
    header: req.session.user ? "partials/login_header" : "partials/header",
    viewName: "users/orderHistory",
    activePage: "Order History",
    isAdmin: false,
    orders,
  });
});

exports.getOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate({
    path: "orderItems",
    populate: {
      path: "product",
    },
  });

  res.render("layout", {
    title: "Order Detail",
    header: req.session.user ? "partials/login_header" : "partials/header",
    viewName: "users/orderDetail",
    activePage: "Order",
    isAdmin: false,
    order,
  });
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (order.status === "Shipped" || order.status === "Delivered") {
      order.isCancelled = true;
      await Order.findByIdAndUpdate(orderId, {
        isCancelled: true,
      });
    } else if (order.status === "Pending" || order.status === "Processed") {
      const user = await User.findById(order.user);
      if (!user) {
        throw new Error("User not found");
      }

      await User.findByIdAndUpdate(order.user, {
        $inc: { walletBalance: order.finalTotal }, // Add the order amount to the wallet balance
        $push: {
          walletTransactions: {
            transactionType: "Credit",
            amount: order.finalTotal,
            description: `Refund for cancelled order #${order._id}`,
            date: new Date(),
          },
        },
      });

      await Order.findByIdAndUpdate(orderId, { status: "Cancelled" });
    } else {
      res
        .status(400)
        .json({ message: "Order cannot be cancelled in its current status" });
    }

    return res.status(200).json({
      message: "Order cancelled successfully",
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

const asyncHandler = require('express-async-handler');
const moment = require('moment');
const Order = require('../../models/order');
const Product = require('../../models/products');
const Category = require('../../models/categories');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  Sales Report Controllers
// ============================

const getDateRange = (filterType) => {
  const today = moment().startOf('day');

  switch (filterType) {
    case 'Daily':
      return {
        start: today.clone(), // Clone to avoid mutation
        end: today.clone().endOf('day'),
      };
    case 'Weekly':
      return {
        start: today.clone().startOf('week'),
        end: today.clone().endOf('week'),
      };
    case 'Monthly':
      return {
        start: today.clone().startOf('month'),
        end: today.clone().endOf('month'),
      };
    case 'Yearly':
      return {
        start: today.clone().startOf('year'),
        end: today.clone().endOf('year'),
      };
    default:
      return { start: null, end: null };
  }
};

const getSalesReport = asyncHandler(async (req, res) => {
  const { filter, startDate, endDate } = req.body;
  let start;
  let end;

  // Determine date range
  if (filter === 'Custom Date Range' && startDate && endDate) {
    start = moment(startDate).startOf('day');
    end = moment(endDate).endOf('day');
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
      const dateKey = moment(order.dateOrdered).format('YYYY-MM-DD');
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
      const { discountApplied } = order; // Already provided in the order model

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
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: RESPONSE_MESSAGES.SERVER_ERROR });
  }
});

const getSalesData = asyncHandler(async (req, res) => {
  try {
    const filter = req.query.filter || 'Monthly';
    let match = {};
    let groupId = null;

    const today = new Date();

    switch (filter) {
      case 'Daily': {
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
          $dateToString: { format: '%Y-%m-%d', date: '$dateOrdered' },
        };
        break;
      }

      case 'Weekly': {
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
          week: { $isoWeek: '$dateOrdered' },
          year: { $isoWeekYear: '$dateOrdered' },
        };
        break;
      }

      case 'Monthly': {
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
          $dateToString: { format: '%Y-%m', date: '$dateOrdered' },
        };
        break;
      }

      case 'Yearly': {
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
          $dateToString: { format: '%Y', date: '$dateOrdered' },
        };
        break;
      }

      case 'Custom Date Range': {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);

        if (Number.isNaN(startDate) || Number.isNaN(endDate)) {
          return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: 'Invalid date range' });
        }

        match = {
          dateOrdered: {
            $gte: startDate,
            $lte: endDate,
          },
        };

        groupId = {
          $dateToString: { format: '%Y-%m-%d', date: '$dateOrdered' },
        };
        break;
      }

      default: {
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
          $dateToString: { format: '%Y-%m', date: '$dateOrdered' },
        };
        break;
      }
    }

    // Aggregation pipeline
    const salesData = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupId,
          totalSales: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Prepare data for the chart
    let labels = [];
    let values = [];

    if (filter === 'Weekly') {
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
    console.error('Error fetching sales data:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: RESPONSE_MESSAGES.SERVER_ERROR });
  }
});

const getBestSellers = asyncHandler(async (req, res) => {
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
          from: 'products',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'products',
        },
      },
      {
        $project: {
          name: 1,
          popularity: { $sum: '$products.popularity' },
        },
      },
      {
        $sort: { popularity: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    res.status(StatusCodes.OK).json({
      topProducts: topProducts.map((product) => ({
        name: product.name,
        image: product.images.main,
        popularity: product.popularity,
      })),
      topCategories: topCategories.map((category) => ({
        name: category.name,
        popularity: category.popularity || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching best sellers:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: RESPONSE_MESSAGES.FAILED_TO_FETCH_DATA });
  }
});

module.exports = {
  getSalesReport,
  getSalesData,
  getBestSellers,
};

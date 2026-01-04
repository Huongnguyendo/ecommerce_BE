const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const Order = require("../models/order");
const User = require("../models/user");
const Product = require("../models/product");

const orderController = {};

// Get all orders (for admin)
orderController.getAllOrders = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const totalOrders = await Order.countDocuments({
    ...filter,
  });
  const totalPages = Math.ceil(totalOrders / limit);
  const offset = limit * (page - 1);

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .populate("orderItems.product", "name image")
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(
    res,
    200,
    true,
    { orders, totalPages, totalOrders },
    null,
    "Orders retrieved successfully"
  );
});

// Get single order
orderController.getSingleOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("orderItems.product", "name image description");

  if (!order) {
    return sendResponse(
      res,
      404,
      false,
      { error: "Order not found" },
      null,
      null
    );
  }

  return sendResponse(res, 200, true, order, null, "Order retrieved successfully");
});

// Update order status
orderController.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { isPaid, isDelivered } = req.body;
  const orderId = req.params.id;

  const updateData = {};
  if (isPaid !== undefined) updateData.isPaid = isPaid;
  if (isDelivered !== undefined) {
    updateData.isDelivered = isDelivered;
    if (isDelivered) updateData.deliveredAt = new Date();
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    updateData,
    { new: true }
  ).populate("user", "name email");

  if (!order) {
    return sendResponse(
      res,
      404,
      false,
      { error: "Order not found" },
      null,
      null
    );
  }

  return sendResponse(res, 200, true, order, null, "Order updated successfully");
});

// Delete order
orderController.deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    return sendResponse(
      res,
      404,
      false,
      { error: "Order not found" },
      null,
      null
    );
  }

  return sendResponse(res, 200, true, null, null, "Order deleted successfully");
});

// Get order statistics
orderController.getOrderStats = catchAsync(async (req, res, next) => {
  const totalOrders = await Order.countDocuments();
  const paidOrders = await Order.countDocuments({ isPaid: true });
  const deliveredOrders = await Order.countDocuments({ isDelivered: true });
  const pendingOrders = await Order.countDocuments({ isPaid: false });
  
  const totalRevenue = await Order.aggregate([
    { $match: { isPaid: true } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } }
  ]);

  const stats = {
    totalOrders,
    paidOrders,
    deliveredOrders,
    pendingOrders,
    totalRevenue: totalRevenue[0]?.total || 0
  };

  return sendResponse(res, 200, true, stats, null, "Order statistics retrieved successfully");
});

// Get analytics data
orderController.getAnalytics = catchAsync(async (req, res, next) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get total users and active users today
    const totalUsers = await User.countDocuments({ isDeleted: false });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyActiveUsers = await User.countDocuments({
      updatedAt: { $gte: today },
      isDeleted: false
    });

    // Get order statistics
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.find({ isPaid: true });
    const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    // Calculate conversion rate (orders / users, simplified)
    const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers * 100) : 0;

    // Calculate revenue growth (current period vs previous period)
    const periodStart = startDate;
    const periodEnd = now;
    const previousPeriodStart = new Date(periodStart);
    const previousPeriodEnd = new Date(periodStart); // End of previous period is start of current period
    
    if (timeRange === '7d') {
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
    } else if (timeRange === '30d') {
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
    } else if (timeRange === '90d') {
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 90);
    } else {
      previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
    }
    // previousPeriodEnd is already set to periodStart (start of current period)

    const currentPeriodRevenue = await Order.aggregate([
      { $match: { isPaid: true, createdAt: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]);

    const previousPeriodRevenue = await Order.aggregate([
      { $match: { isPaid: true, createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]);

    const currentRev = currentPeriodRevenue[0]?.total || 0;
    const previousRev = previousPeriodRevenue[0]?.total || 0;
    const revenueGrowth = previousRev > 0 ? ((currentRev - previousRev) / previousRev * 100) : (currentRev > 0 ? 100 : 0);

    // Get user growth by month (last 6 months)
    const userGrowth = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthUsers = await User.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        isDeleted: false
      });
      userGrowth.push({
        month: monthNames[monthStart.getMonth()],
        users: monthUsers
      });
    }

    // Get revenue trend by month (last 6 months)
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthRevenue = await Order.aggregate([
        { $match: { isPaid: true, createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
      ]);
      revenueTrend.push({
        month: monthNames[monthStart.getMonth()],
        revenue: monthRevenue[0]?.total || 0
      });
    }

    // Get revenue by category
    const ordersWithProducts = await Order.find({ isPaid: true })
      .populate('orderItems.product', 'category')
      .lean();
    
    const categoryRevenue = {};
    ordersWithProducts.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.product && item.product.category) {
          const category = item.product.category;
          const itemRevenue = parseFloat(item.price || 0) * (item.quantity || 0);
          categoryRevenue[category] = (categoryRevenue[category] || 0) + itemRevenue;
        }
      });
    });

    const totalCategoryRevenue = Object.values(categoryRevenue).reduce((sum, rev) => sum + rev, 0);
    const topCategories = Object.entries(categoryRevenue)
      .map(([name, revenue]) => ({
        name,
        revenue,
        percentage: totalCategoryRevenue > 0 ? Math.round((revenue / totalCategoryRevenue) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Estimate page views (orders * 10 as approximation, since we don't track page views)
    const pageViews = totalOrders * 10;

    // Estimate bounce rate (simplified: users with no orders / total users)
    const usersWithOrders = await User.countDocuments({
      _id: { $in: (await Order.distinct('user')) },
      isDeleted: false
    });
    const bounceRate = totalUsers > 0 ? ((totalUsers - usersWithOrders) / totalUsers * 100) : 0;

    const analytics = {
      userEngagement: {
        dailyActiveUsers,
        sessionDuration: 0, // Not tracked, would need session tracking
        pageViews,
        bounceRate: Math.round(bounceRate * 10) / 10
      },
      revenue: {
        totalRevenue,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        conversionRate: Math.round(conversionRate * 10) / 10,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10
      },
      performance: {
        pageLoadTime: 0, // Would need frontend tracking
        apiResponseTime: 0, // Would need API monitoring
        errorRate: 0, // Would need error tracking
        uptime: 99.9 // Would need server monitoring
      },
      trends: {
        userGrowth,
        revenueTrend,
        topCategories,
        peakHours: [] // Would need time-based order tracking
      }
    };

    return sendResponse(res, 200, true, analytics, null, "Analytics retrieved successfully");
  } catch (error) {
    return sendResponse(
      res,
      500,
      false,
      { error: error.message },
      null,
      "Error retrieving analytics"
    );
  }
});

module.exports = orderController;

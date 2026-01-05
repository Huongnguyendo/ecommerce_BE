const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const User = require("../models/user");
const Cart = require("../models/cart");
const bcrypt = require("bcryptjs");
const Product = require("../models/product");
const Order = require("../models/order");
const userController = {};

userController.register = catchAsync(async (req, res, next) => {
  let { name, email, avatarUrl, password, role } = req.body;
  let user = await User.findOne({ email });
  if (user)
    // return next(new AppError(409, "User already exists", "Register Error"));
    return sendResponse(
      res,
      409,
      false,
      { error: "User already exists" },
      null,
      null
    );

  const salt = await bcrypt.genSalt(10);
  password = await bcrypt.hash(password, salt);
  user = await User.create({
    name,
    email,
    password,
    avatarUrl,
    role,
  });
  // const accessToken = await user.generateToken();

  return sendResponse(
    res,
    200,
    true,
    { user },
    null,
    "Create user successfully"
  );
});

userController.updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const allows = ["name", "password", "avatarUrl"];
  const user = await User.findById(userId);
  if (!user) {
    // return next(new AppError(404, "Account not found", "Update Profile Error"));
    return sendResponse(
      res,
      404,
      false,
      { error: "Update Profile Error" },
      null,
      null
    );
  }

  allows.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  await user.save();
  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Update Profile successfully"
  );
});

userController.getUsers = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  const currentUserId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  // For admin endpoints, include all users (active, inactive, and deleted)
  // The isDeletedFalse plugin will auto-filter unless we explicitly set isDeleted
  // So we set it to include both true and false values
  const queryFilter = {
    ...filter,
    isDeleted: { $in: [true, false] } // Include both deleted and non-deleted users
  };

  const totalUsers = await User.countDocuments(queryFilter);
  const totalPages = Math.ceil(totalUsers / limit);

  const offset = limit * (page - 1);

  // Explicitly include deleted users by setting isDeleted in the query
  // Use lean() to get plain objects and bypass toJSON which removes isDeleted
  let users = await User.find(queryFilter)
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  // Manually remove password from each user (toJSON normally does this)
  users = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  return sendResponse(res, 200, true, { users: users, totalPages }, null, "");
});

userController.deleteUser = catchAsync(async (req, res, next) => {
  const targetUserId = req.params.id;

  let user = await User.findOneAndUpdate(
    { _id: targetUserId },
    { isDeleted: true }
    // { new: true }
  );

  if (!user)
    // return next(
    //   new AppError(
    //     400,
    //     "User not found or Action not authorized",
    //     "Delete User Error"
    //   )
    // );
    return sendResponse(
      res,
      400,
      false,
      { error: "User not found or Action not authorized" },
      null,
      null
    );

  return sendResponse(res, 200, true, null, null, "Delete User successfully");
});

userController.getCurrentUser = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user)
    // return next(new AppError(400, "User not found", "Get Current User Error"));
    return sendResponse(
      res,
      400,
      false,
      { error: "Get Current User Error" },
      null,
      null
    );
  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Get current user successfully"
  );
});

userController.getBuyingHistory = catchAsync(async (req, res, next) => {
  // let product = await Product.findById(req.params.id).populate("seller").populate("user");
  let userId = req.userId;

  let carts = await Cart.find({ user: userId, isCheckedout: true }).populate({
    path: "cartItems.product",
  });

  return sendResponse(res, 200, true, carts, null, null);
});

userController.verifyEmail = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  let user = await User.findOne({
    emailVerificationCode: code,
  });
  if (!user) {
    // return next(
    //   new AppError(400, "Invalid Verification Code", "Verify Email Error")
    // );
    return sendResponse(
      res,
      400,
      false,
      { error: "Verify Email Error" },
      null,
      null
    );
  }
  user = await User.findByIdAndUpdate(
    user._id,
    {
      $set: { emailVerified: true },
      $unset: { emailVerificationCode: 1 },
    },
    { new: true }
  );
  return sendResponse(
    res,
    200,
    true,
    { user },
    null,
    "Email successfully verified!"
  );
});

userController.addToWishlist = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { productId } = req.body;
  if (!productId) return sendResponse(res, 400, false, null, null, "Product ID required");
  const user = await User.findById(userId);
  if (!user) return sendResponse(res, 404, false, null, null, "User not found");
  if (!user.wishlist.includes(productId)) {
    user.wishlist.push(productId);
    await user.save();
  }
  return sendResponse(res, 200, true, user.wishlist, null, "Added to wishlist");
});

userController.removeFromWishlist = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { productId } = req.body;
  if (!productId) return sendResponse(res, 400, false, null, null, "Product ID required");
  const user = await User.findById(userId);
  if (!user) return sendResponse(res, 404, false, null, null, "User not found");
  user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
  await user.save();
  return sendResponse(res, 200, true, user.wishlist, null, "Removed from wishlist");
});

userController.getWishlist = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const user = await User.findById(userId).populate('wishlist');
  if (!user) return sendResponse(res, 404, false, null, null, "User not found");
  return sendResponse(res, 200, true, user.wishlist, null, "Fetched wishlist");
});

userController.getRecentViews = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.userId).populate({
    path: 'recentViews',
    match: { isDeleted: false }, // Products still use isDeleted
  });
  if (!user) return sendResponse(res, 404, false, null, null, 'User not found');
  return sendResponse(res, 200, true, user.recentViews || [], null, '');
});

userController.getRecentSearches = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user) return sendResponse(res, 404, false, null, null, 'User not found');
  return sendResponse(res, 200, true, user.recentSearches || [], null, '');
});

// Get all sellers for admin approval
userController.getSellersForApproval = catchAsync(async (req, res, next) => {
  const sellers = await User.find({ 
    role: "Seller",
    isDeleted: false 
  }).select('name email avatarUrl isApproved createdAt');

  return sendResponse(
    res,
    200,
    true,
    { sellers },
    null,
    "Sellers retrieved successfully"
  );
});

// Approve seller
userController.approveSeller = catchAsync(async (req, res, next) => {
  const { sellerId } = req.params;
  
  const seller = await User.findByIdAndUpdate(
    sellerId,
    { isApproved: true },
    { new: true }
  );

  if (!seller) {
    return sendResponse(
      res,
      404,
      false,
      { error: "Seller not found" },
      null,
      null
    );
  }

  if (seller.role !== "Seller") {
    return sendResponse(
      res,
      400,
      false,
      { error: "User is not a seller" },
      null,
      null
    );
  }

  return sendResponse(
    res,
    200,
    true,
    { seller },
    null,
    "Seller approved successfully"
  );
});

// Reject seller
userController.rejectSeller = catchAsync(async (req, res, next) => {
  const { sellerId } = req.params;
  
  const seller = await User.findByIdAndUpdate(
    sellerId,
    { isApproved: false },
    { new: true }
  );

  if (!seller) {
    return sendResponse(
      res,
      404,
      false,
      { error: "Seller not found" },
      null,
      null
    );
  }

  if (seller.role !== "Seller") {
    return sendResponse(
      res,
      400,
      false,
      { error: "User is not a seller" },
      null,
      null
    );
  }

  return sendResponse(
    res,
    200,
    true,
    { seller },
    null,
    "Seller rejected successfully"
  );
});

// Get admin dashboard stats
userController.getAdminDashboardStats = catchAsync(async (req, res, next) => {
  try {
    // Get basic counts
    const totalUsers = await User.countDocuments({ isDeleted: false });
    const totalSellers = await User.countDocuments({ role: 'Seller', isDeleted: false });
    const pendingSellers = await User.countDocuments({ role: 'Seller', isApproved: false, isDeleted: false });
    const activeSellers = await User.countDocuments({ role: 'Seller', isApproved: true, isDeleted: false });
    
    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo },
      isDeleted: false 
    });
    
    // Get users by role
    const usersByRole = await User.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentActivity = await User.countDocuments({
      updatedAt: { $gte: oneDayAgo },
      isDeleted: false
    });

    // Calculate platform growth: compare current month users vs previous month
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const usersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfCurrentMonth },
      isDeleted: false
    });
    
    const usersLastMonth = await User.countDocuments({
      createdAt: { 
        $gte: startOfPreviousMonth,
        $lte: endOfPreviousMonth
      },
      isDeleted: false
    });
    
    // Calculate growth percentage
    let platformGrowth = 0;
    if (usersLastMonth > 0) {
      platformGrowth = ((usersThisMonth - usersLastMonth) / usersLastMonth * 100).toFixed(1);
    } else if (usersThisMonth > 0) {
      platformGrowth = 100; // 100% growth if no users last month but users this month
    }

    // Get new users today (last 24 hours)
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: oneDayAgo },
      isDeleted: false
    });

    const stats = {
      totalUsers,
      totalSellers,
      pendingSellers,
      activeSellers,
      newUsersThisWeek,
      newUsersToday,
      recentActivity,
      platformGrowth: parseFloat(platformGrowth),
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      platformHealth: {
        status: 'operational',
        uptime: process.uptime() // Real uptime in seconds
      }
    };

    return sendResponse(
      res,
      200,
      true,
      { stats },
      null,
      "Admin dashboard stats retrieved successfully"
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      false,
      { error: error.message },
      null,
      "Error retrieving admin dashboard stats"
    );
  }
});

// Update user for admin
userController.updateUserForAdmin = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;
  
  // Only allow specific fields to be updated by admin
  // isActive: for toggling active/inactive status (user can be reactivated)
  // isDeleted: for permanent deletion (soft delete, user data preserved but hidden)
  const allowedFields = ['isApproved', 'isActive', 'isDeleted'];
  const filteredData = {};
  
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });
  
  // If no valid fields to update, return error
  if (Object.keys(filteredData).length === 0) {
    return sendResponse(
      res,
      400,
      false,
      { error: "No valid fields to update" },
      null,
      null
    );
  }
  
  // Use findOneAndUpdate with explicit isDeleted condition to bypass plugin filtering
  // The plugin only adds isDeleted: false if it's undefined, so by explicitly setting it
  // to include both true and false, we bypass the plugin's filtering
  // This allows updating users regardless of their isDeleted status
  const query = { _id: id };
  query.isDeleted = { $in: [true, false] }; // Explicitly allow both deleted and non-deleted users
  
  const user = await User.findOneAndUpdate(
    query,
    { $set: filteredData },
    { new: true, runValidators: true }
  ).lean(); // Use lean() to bypass toJSON

  if (!user) {
    return sendResponse(
      res,
      404,
      false,
      { error: "User not found" },
      null,
      null
    );
  }

  // Remove password from response (toJSON normally does this)
  const { password, ...userWithoutPassword } = user;

  return sendResponse(
    res,
    200,
    true,
    { user: userWithoutPassword },
    null,
    "User updated successfully"
  );
});

module.exports = userController;

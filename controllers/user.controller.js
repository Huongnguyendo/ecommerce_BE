const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
  const User = require("../models/User");
  const Cart = require('../models/cart');
  const bcrypt = require("bcryptjs");
  const userController = {};
  
  
  userController.register = catchAsync(async (req, res, next) => {
      console.log("hihi");
    let { name, email, avatarUrl, password, role } = req.body;
    let user = await User.findOne({ email });
    if (user)
      return next(new AppError(409, "User already exists", "Register Error"));
  
    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password, salt);
    user = await User.create({
      name,
      email,
      password,
      avatarUrl,
      role
    });
    const accessToken = await user.generateToken();
  
    return sendResponse(res, 200, true, { user }, null, "Create user successful");
  });

userController.updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const allows = ["name", "password", "avatarUrl"];
  console.log("avatar: ", req.body);
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(404, "Account not found", "Update Profile Error"));
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

  const totalUsers = await User.countDocuments({
    ...filter,
    isDeleted: false,
  });
  const totalPages = Math.ceil(totalUsers / limit);
  console.log("totalPages ne", totalPages);

  const offset = limit * (page - 1);

  let users = await User.find(filter)
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(
    res,
    200,
    true,
    { users: users, totalPages },
    null,
    ""
  );
});


userController.deleteUser = catchAsync(async (req, res, next) => {
  const targetUserId = req.params.id;
  console.log("targetUserId", targetUserId);

  let user = await User.findOneAndUpdate({ _id: targetUserId},
    { isDeleted: true },
    // { new: true }
    )

    if (!user)
    return next(
      new AppError(
        400,
        "User not found or Action not authorized",
        "Delete User Error"
      )
    );

  return sendResponse(res, 200, true, null, null, "Delete User successful");
});



userController.getCurrentUser = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user)
    return next(new AppError(400, "User not found", "Get Current User Error"));
  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Get current user successful"
  );
});
  
userController.getBuyingHistory = catchAsync(async (req, res, next) => {
    // let product = await Product.findById(req.params.id).populate("seller").populate("user");
    let userId = req.userId;

    let carts = await Cart.find({ user: userId, isCheckedout: true}).populate({path : "cartItems.product"})
    
  console.log("huefhiuahfuha");
    console.log("userHistory ne: ", carts);
    
    return sendResponse(res, 200, true, carts, null, null);
})


userController.verifyEmail = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  let user = await User.findOne({
    emailVerificationCode: code,
  });
  if (!user) {
    return next(
      new AppError(400, "Invalid Verification Code", "Verify Email Error")
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

  
  module.exports = userController;
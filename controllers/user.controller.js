const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
  const User = require("../models/User");
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
  const offset = limit * (page - 1);

  let users = await User.find(filter)
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friendship = await Friendship.findOne(
      {
        $or: [
          { from: currentUserId, to: user._id },
          { from: user._id, to: currentUserId },
        ],
      },
      "-_id status updatedAt"
    );
    return temp;
  });
  const usersWithFriendship = await Promise.all(promises);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriendship, totalPages },
    null,
    ""
  );
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
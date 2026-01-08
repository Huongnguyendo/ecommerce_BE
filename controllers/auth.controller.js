const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const authController = {};

authController.loginWithEmail = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Normalize email to lowercase for consistent lookup
  const normalizedEmail = email ? email.toLowerCase().trim() : '';
  
  if (!normalizedEmail || !password) {
    return sendResponse(
      res,
      400,
      false,
      { error: "Email and password are required" },
      null,
      null
    );
  }
  
  // Let the isDeletedFalse plugin handle isDeleted filtering automatically
  // Don't explicitly set isDeleted to avoid conflicts with the plugin
  const user = await User.findOne({ email: normalizedEmail }, "+password");
  
  if (!user) {
    return sendResponse(
      res,
      400,
      false,
      { error: "Invalid credentials" },
      null,
      null
    );
  }

  // Check if user account is active (inactive users cannot log in)
  // Only block if explicitly false, treat undefined/null as active
  if (user.isActive === false) {
    return sendResponse(
      res,
      403,
      false,
      { error: "Your account has been deactivated. Please contact an administrator." },
      null,
      null
    );
  }

  // after had had user, compare raw password and hash password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    // return next(new AppError(400, "Wrong password", "Login Error"));

    return sendResponse(
      res,
      400,
      false,
      { error: "Wrong password" },
      null,
      null
    );

  // when user successfully logined, generate a token to send back to their browser
  // here we create a token for the instance user
  accessToken = await user.generateToken();

  // newly added
  // next();

  // req.userId = user._id;
  return sendResponse(
    res,
    200,
    true,
    { user, accessToken },
    null,
    "Login successfully"
  );
});

authController.loginWithFacebookOrGoogle = catchAsync(
  async (req, res, next) => {
    // req.user is from FacebookTokenStrategy
    let profile = req.user;
    profile.email = profile.email.toLowerCase();
    let user = await User.findOne({ email: profile.email });
    // bc password field is required
    const randomPassword = "" + Math.floor(Math.random() * 10000000);
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(randomPassword, salt);

    // if the email exists in the database
    if (user) {
      // Check if user account is active (inactive users cannot log in)
      if (user.isActive === false) {
        return sendResponse(
          res,
          403,
          false,
          { error: "Your account has been deactivated. Please contact an administrator." },
          null,
          null
        );
      }
      
      // if email not yet verified, update verification status to true
      if (!user.emailVerified) {
        user = await User.findByIdAndUpdate(
          user._id,
          {
            $set: { emailVerified: true, avatarUrl: profile.avatarUrl }, //email verified
            $unset: { emailVerificationCode: 1 },
          },
          { new: true }
        );
      }
      // if email already verified, update profile avatar url from facebook
      else {
        user = await User.findByIdAndUpdate(
          user._id,
          { avatarUrl: profile.avatarUrl },
          { new: true }
        );
      }
    }
    // if no email exists in database, create new user
    else {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        password: newPassword,
        avatarUrl: profile.avatarUrl,
      });
    }
    // not fb accressToken
    const accessToken = await user.generateToken();
    return sendResponse(
      res,
      200,
      true,
      { user, accessToken },
      null,
      "Login successful"
    );
  }
);

module.exports = authController;
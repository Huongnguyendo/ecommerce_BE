const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
  const User = require("../models/User");
  const bcrypt = require("bcryptjs");
  const authController = {};
  
  authController.loginWithEmail = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // create an instance user of class User
    console.log("hehe", email, password);
    const user = await User.findOne({ email }, "+password");
    console.log(user)
    if (!user)
      return next(new AppError(400, "Invalid credentials", "Login Error"));
  // after had user, compare raw password and hash password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new AppError(400, "Wrong password", "Login Error"));
  // when user successfully logined, generate a token to send back to their browser
  // here we create a token for the instance user
    accessToken = await user.generateToken();
    console.log("res be ne: ", res);
    return sendResponse(
      res,
      200,
      true,
      // cuz we need to send back the token to the browser
      { user, accessToken },
      null,
      "Login successful"
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
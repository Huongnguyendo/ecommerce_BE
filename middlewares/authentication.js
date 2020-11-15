const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const { AppError,sendResponse } = require("../helpers/utils.helper");
const User = require("../models/user");
const authMiddleware = {};

authMiddleware.loginRequired = async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    if (!tokenString)
      return next(new AppError(401, "Login required", "Validation Error"));
    const token = tokenString.replace("Bearer ", "");
    
    let decode =  await  jwt.verify(token, JWT_SECRET_KEY)
     jwt.verify(token, JWT_SECRET_KEY, (err, payload) => {
      if (err) {
        console.log(err);
        if (err.name === "TokenExpiredError") {
          return next(new AppError(401, "Token expired", "Validation Error"));
        } else {
          return next(
            new AppError(401, err, "Validation Error")
          );
        }
      }
      // we need this userId to find the user
      // next middleware we will need this req.userId
      // only when token is still valid, we return the user
  
      req.userId = payload._id;
    });
    next();
  } catch (error) {
    next(error);
  }
};

authMiddleware.isAdmin = async (req, res, next) => {
  try {
    let user = await User.findById(req.userId);
    if (user.role === "Admin") {
      return next();
    } else {
      return next(new AppError(403, "Admin required", "Validation Error"));
    }
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
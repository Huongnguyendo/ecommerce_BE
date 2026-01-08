const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const { AppError, sendResponse } = require("../helpers/utils.helper");
const User = require("../models/user");
const authMiddleware = {};

authMiddleware.attachUserIfExists = async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    if (!tokenString) {
      // No token provided, continue without setting userId
      return next();
    }
    
    const token = tokenString.replace("Bearer ", "");
    
    if (!JWT_SECRET_KEY) {
      console.error("JWT_SECRET_KEY environment variable is not set");
      return next();
    }
    
    jwt.verify(token, JWT_SECRET_KEY, (err, decodedPayload) => {
      if (err) {
        // Token is invalid or expired, continue without setting userId
        console.log('Token verification failed:', err.message);
        return next();
      }
      
      // Token is valid, set userId
      req.userId = decodedPayload._id;
      console.log('User attached, userId:', req.userId);
      next();
    });
  } catch (error) {
    // Error occurred, continue without setting userId
    console.log('Error in attachUserIfExists:', error.message);
    next();
  }
};

authMiddleware.loginRequired = async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    if (!tokenString)
      // return next(new AppError(401, "Login required", "Validation Error"));
      // return sendResponse(res, 401, false, null, null, "Login required");
      return sendResponse(
        res,
        401,
        false,
        { error: "Login required" },
        null,
        null
      );
    const token = tokenString.replace("Bearer ", "");

    // let decode = await jwt.verify(token, JWT_SECRET_KEY);
    jwt.verify(token, JWT_SECRET_KEY, (err, decodedPayload) => {
      if (err) {
        console.log(err);
        if (err.name === "TokenExpiredError") {
          // return next(new AppError(401, "Token expired", "Validation Error"));
          return sendResponse(
            res,
            401,
            false,
            { error: "Token expired" },
            null,
            null
          );
        } else {
          // return next(new AppError(401, err, "Validation Error"));
          return sendResponse(res, 401, false, { error: err }, null, null);
        }
      }
      // we need this userId to find the user
      // next middleware we will need this req.userId
      // only when token is still valid, we return the user

      // get id of decodedPayload, attach it to req as userId
      req.userId = decodedPayload._id;
      next();
    });
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
      // return next(new AppError(403, "Admin required", "Validation Error"));
      return sendResponse(
        res,
        403,
        false,
        { error: "Admin required" },
        null,
        null
      );
    }
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;

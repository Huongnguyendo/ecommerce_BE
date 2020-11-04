const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const { AppError } = require("../helpers/utils.helper");
const authMiddleware = {};

authMiddleware.loginRequired = async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    if (!tokenString)
      return next(new AppError(401, "Login required", "Validation Error"));
    const token = tokenString.replace("Bearer ", "");
    console.log("hehehehe", tokenString)
    console.log("dsdsd",token,"ok")
let decode =  await  jwt.verify(token, JWT_SECRET_KEY)
console.log(decode)
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
      // console.log(payload);
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

module.exports = authMiddleware;
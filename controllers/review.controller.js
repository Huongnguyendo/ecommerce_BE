const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
  const Review = require("../models/review");
  const Product = require("../models/product");
  const User = require("../models/user");
  
  const reviewController = {};
  
  reviewController.createNewReview = catchAsync(async (req, res, next) => {
    const userId = req.userId;
    const productId = req.params.id;
    const { content } = req.body;

    // newly added
    let user = await User.findById(userId);
    if(!user.emailVerified) {
      return new AppError(400, "User need to verify email first!");
    }
  
    const product = Product.findById(productId);
    if (!product)
      return next(new AppError(404, "product not found", "Create New Review Error"));
  
    let review = await Review.create({
      user: userId,
      product: productId,
      content,
    });
    review = await review.populate("user").execPopulate();
    return sendResponse(
      res,
      200,
      true,
      review,
      null,
      "Create new review successful"
    );
  });
  
  reviewController.getReviewsOfProduct = catchAsync(async (req, res, next) => {
    const productId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
  
    const product = Product.findById(productId);
    if (!product)
      return next(new AppError(404, "product not found", "Create New Review Error"));
  
    const totalReviews = await Review.countDocuments({ product: productId });
    const totalPages = Math.ceil(totalReviews / limit);
    const offset = limit * (page - 1);
  
    const reviews = await Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  
    return sendResponse(res, 200, true, { reviews, totalPages }, null, "");
  });
  
  reviewController.updateSingleReview = catchAsync(async (req, res, next) => {
    const userId = req.userId;
    const reviewId = req.params.id;
    const { content } = req.body;
  
    const review = await Review.findOneAndUpdate(
      { _id: reviewId, user: userId },
      { content },
      { new: true }
    );
    if (!review)
      return next(
        new AppError(
          400,
          "Review not found or User not authorized",
          "Update Review Error"
        )
      );
    return sendResponse(res, 200, true, review, null, "Update successful");
  });
  
  reviewController.deleteSingleReview = catchAsync(async (req, res, next) => {
    const userId = req.userId;
    const reviewId = req.params.id;
  
    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user: userId,
    });
    if (!review)
      return next(
        new AppError(
          400,
          "Review not found or User not authorized",
          "Delete Review Error"
        )
      );
    return sendResponse(res, 200, true, null, null, "Delete successful");
  });
  
  module.exports = reviewController;
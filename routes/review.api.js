const express = require("express");
const router = express.Router();
const validators = require("../middlewares/validators");
const authMiddleware = require("../middlewares/authentication");
const { body, param } = require("express-validator");
const reviewController = require("../controllers/review.controller");

/**
 * @route GET api/reviews/blogs/:id?page=1&limit=10
 * @description Get reviews of a blog with pagination
 * @access Public
 */
router.get(
    "/products/:id",
    validators.validate([
      param("id").exists().isString().custom(validators.checkObjectId),
    ]),
    reviewController.getReviewsOfProduct
  );
/**
 * @route POST api/reviews/blogs/:id
 * @description Create a new review for a blog
 * @access Login required
 */
router.post(
    "/products/:id",
    authMiddleware.loginRequired,
    validators.validate([
      param("id").exists().isString().custom(validators.checkObjectId),
      body("content", "Missing content").exists().notEmpty(),
    ]),
    reviewController.createNewReview
  );
/**
 * @route PUT api/reviews/:id
 * @description Update a review
 * @access Login required
 */
router.put(
    "/:id",
    authMiddleware.loginRequired,
    validators.validate([
      param("id").exists().isString().custom(validators.checkObjectId),
      body("content", "Missing content").exists().notEmpty(),
    ]),
    reviewController.updateSingleReview
  );
/**
 * @route DELETE api/reviews/:id
 * @description Delete a review
 * @access Login required
 */
router.delete(
    "/:id",
    authMiddleware.loginRequired,
    validators.validate([
      param("id").exists().isString().custom(validators.checkObjectId),
    ]),
    reviewController.deleteSingleReview
  );
module.exports = router;
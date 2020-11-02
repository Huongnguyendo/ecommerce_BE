// 1. require, define
const express = require("express");
const router = express.Router();

// 2. require controllers
const productController = require("../controllers/product.controller");
const validators = require("../middlewares/validators");
const authMiddleware = require("../middlewares/authentication");
const { body, param } = require("express-validator");

// 3. assign routes to controllers
/**
 * @route GET api/blogs?page=1&limit=10
 * @description Get blogs with pagination
 * @access Public
 */

router.get("/", productController.getProducts);

/**
 * @route GET api/blogs/:id
 * @description Get a single blog
 * @access Public
 */
router.get(
  "/:id",
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
  ]),
  productController.getSingleProduct
);


/**
 * @route POST api/blogs
 * @description Create a new blog
 * @access Login required
 */

router.post(
  "/",
  authMiddleware.loginRequired,
  // uploader.array("images", 2),
  validators.validate([
    body("title", "Missing title").exists().notEmpty(),
    body("content", "Missing content").exists().notEmpty(),
  ]),
  productController.createNewProduct
);

  
/**
 * @route PUT api/blogs/:id
 * @description Update a blog
 * @access Login required
 */

router.put(
  "/:id",
  authMiddleware.loginRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
    body("title", "Missing title").exists().notEmpty(),
    body("content", "Missing content").exists().notEmpty(),
  ]),
  productController.updateSingleProduct
);

/**
 * @route DELETE api/blogs/:id
 * @description Delete a blog
 * @access Login required
 */
router.delete(
  "/:id",
  authMiddleware.loginRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
  ]),
  productController.deleteSingleProduct
);
  
// 4. export
module.exports = router;
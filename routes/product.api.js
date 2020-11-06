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

router.route('/')
    .post(
    //   validators.validate([
    //   body("keyword", "Missing keyword").exists().notEmpty(),
    // ]),
      productController.getProductsByKeyword)

router.route('/')
      .post(productController.getProductsWithCategory)

/**
 * @route POST api/products
 * @description Create a new product
 * @access Seller Login required
 */

router.post(
  "/add",
  authMiddleware.loginRequired,
  // uploader.array("images", 2),
  validators.validate([
    body("name", "Missing name").exists().notEmpty(),
    body("description", "Missing description").exists().notEmpty(),
  ]),
  productController.createNewProduct
);



/**
 * @route PUT api/blogs/:id
 * @description Update a blog
 * @access Login required
 */

router.get(
  "/edit/:id",
  authMiddleware.loginRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
    
  ]),
  
  productController.getSingleProductForSeller
);



router.put(
  "/edit/:id",
  authMiddleware.loginRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
    body("name", "Missing name").exists().notEmpty(),
    body("description", "Missing description").exists().notEmpty(),
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
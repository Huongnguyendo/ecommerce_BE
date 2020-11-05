// 1. require, define
const express = require("express");
const router = express.Router();

// 2. require controllers
const productSellerController = require("../controllers/product.seller.controllers");
const validators = require("../middlewares/validators");
const authMiddleware = require("../middlewares/authentication");
const { body, param } = require("express-validator");

/**
 * @route GET api/seller/products
 * @description Get all products of a seller
 * @access Seller login required
 */

router.get(
    "/",
    authMiddleware.loginRequired,
    // validators.validate([
    //   param("id").exists().isString().custom(validators.checkObjectId),
      
    // ]),
    productSellerController.getAllProductsForSeller
  );

// 4. export
module.exports = router;
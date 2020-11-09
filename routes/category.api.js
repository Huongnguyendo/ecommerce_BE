const express = require("express");
const router = express.Router();

// 2. require controllers
const productController = require("../controllers/product.controller");
const validators = require("../middlewares/validators");
const authMiddleware = require("../middlewares/authentication");
const categoryController = require("../controllers/category.controller");
const { body, param } = require("express-validator");


router.route('/')
    .get(categoryController.getCategories)
    // .post(authMiddleware, categoryController.createCategory)

router.route('/')
    .post(productController.getProducts)

// router.route('/category/:id')
//     .delete(authMiddleware, categoryController.deleteCategory)
//     .put(authMiddleware, categoryController.updateCategory)


module.exports = router
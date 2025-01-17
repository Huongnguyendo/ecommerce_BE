const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const validators = require("../middlewares/validators");
const { body } = require("express-validator");
const authMiddleware = require("../middlewares/authentication");

/**
 * @route POST api/users
 * @description Register new user
 * @access Public
 */
router.post(
    "/",
    validators.validate([
      body("name", "Invalid name").exists().notEmpty(),
      body("email", "Invalid email").exists().isEmail(),
      body("password", "Invalid password").exists().notEmpty(),
    ]),
    userController.register
  );
/**
 * @route PUT api/users/
 * @description Update user profile
 * @access Login required
 */

 /* get history */
router.get('/history', 
authMiddleware.loginRequired, 
userController.getBuyingHistory);


router.put("/", authMiddleware.loginRequired, userController.updateProfile);

/**
 * @route GET api/users/me
 * @description Get current user info
 * @access Login required
 */

router.get("/me", authMiddleware.loginRequired, userController.getCurrentUser);



/**
 * @route GET api/users?page=1&limit=10
 * @description Get users with pagination
 * @access Login required
 */
router.get("/", authMiddleware.loginRequired, userController.getUsers);

module.exports = router;

const express = require("express");
const router = express.Router();

const validators = require("../middlewares/validators");
const { body } = require("express-validator");
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/user.controller");
const passport = require("passport");
const authMiddleware = require("../middlewares/authentication");
require("../helpers/passport.helper")

/**
 * @route POST api/auth/login
 * @description Login
 * @access Public
 */
router.post(
    "/login",
    validators.validate([
      body("email", "Invalid email").exists().isEmail(),
      body("password", "Invalid password").exists().notEmpty(),
    ]),
    
    authController.loginWithEmail,
    // authMiddleware.loginRequired,
    // authMiddleware.isAdmin
    
  );

/**
 * @route POST api/auth/login/facebook
 * @description Login with facebook
 * @access Public
 */

router.post(
  "/login/facebook",
  passport.authenticate("facebook-token"),
  authController.loginWithFacebookOrGoogle
);

/**
 * @route POST api/auth/login/google
 * @description Login with google
 * @access Public
 */
router.post(
  "/login/google",
  passport.authenticate("google-token"),
  authController.loginWithFacebookOrGoogle
);


/* ADMIN */
// get admin dashboard

// see all users
router.get(
  "/admin/allusers",
  // validators.validate([
  //   body("email", "Invalid email").exists().isEmail(),
  //   body("password", "Invalid password").exists().notEmpty(),
  // ]),
  
  authMiddleware.loginRequired,
  authMiddleware.isAdmin,
  userController.getUsers
);

// delete a user
router.delete(
  "/admin/user/:id",
  // validators.validate([
  //   body("email", "Invalid email").exists().isEmail(),
  //   body("password", "Invalid password").exists().notEmpty(),
  // ]),
  
  authMiddleware.loginRequired,
  authMiddleware.isAdmin,
  userController.deleteUser
);

// delete a product



module.exports = router;
const express = require("express");
const router = express.Router();

// The router.use() function uses the specified middleware function or functions. It basically mounts middleware for the routes which are being served by the specific router.
// userApi
const userApi = require("./user.api");
router.use("/users", userApi);

// authApi
const authApi = require("./auth.api");
router.use("/auth", authApi);

// productApi
const productApi = require("./product.api");
router.use("/products", productApi);

// productsellerApi
const productSellerApi = require("./product.seller.api");
router.use("/seller/products", productSellerApi);

// cartApi
const cartApi = require("./cart.api");
router.use("/cart", cartApi);

// categoryApi
const categoryApi = require("./category.api");
router.use("/category", categoryApi);

// reviewApi
const reviewApi = require("./review.api");
router.use("/reviews", reviewApi);

// recommendationApi
const recommendationApi = require("./recommendation.api");
router.use("/recommendations", recommendationApi);

// chatbotApi
const chatbotApi = require("./chatbot.api");
router.use("/chatbot", chatbotApi);

// orderApi
const orderApi = require("./order.api");
router.use("/orders", orderApi);

// stripeApi
const stripeApi = require("./stripe.api");
router.use("/stripe", stripeApi);

// send email
router.get("/test-email", (req, res) => {
  email.sendTestEmail();
  res.send("email sent");
});

module.exports = router;

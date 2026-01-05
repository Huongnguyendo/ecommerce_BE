const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot.controller");
const authMiddleware = require("../middlewares/authentication");
const validators = require("../middlewares/validators");

/**
 * @route POST api/chatbot/response
 * @description Get chatbot response
 * @access Public (but attach user if exists)
 */
router.post(
  "/response",
  authMiddleware.attachUserIfExists,
  chatbotController.getResponse
);

/**
 * @route GET api/chatbot/suggestions
 * @description Get quick suggestions
 * @access Public
 */
router.get(
  "/suggestions",
  chatbotController.getSuggestions
);

module.exports = router;

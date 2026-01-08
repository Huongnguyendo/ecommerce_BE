const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/authentication");

/**
 * @route GET api/orders
 * @description Get all orders (admin only)
 * @access Private (Admin)
 */
router.get(
  "/",
  authMiddleware.loginRequired,
  authMiddleware.isAdmin,
  orderController.getAllOrders
);

/**
 * @route GET api/orders/stats
 * @description Get order statistics (admin only)
 * @access Private (Admin)
 */
router.get(
  "/stats",
  authMiddleware.loginRequired,
  authMiddleware.isAdmin,
  orderController.getOrderStats
);

/**
 * @route GET api/orders/analytics
 * @description Get analytics data (admin only)
 * @access Private (Admin)
 */
router.get(
  "/analytics",
  authMiddleware.loginRequired,
  authMiddleware.isAdmin,
  orderController.getAnalytics
);

/**
 * @route GET api/orders/:id
 * @description Get single order
 * @access Private
 */
router.get(
  "/:id",
  authMiddleware.loginRequired,
  orderController.getSingleOrder
);

/**
 * @route PUT api/orders/:id
 * @description Update order status (admin only)
 * @access Private (Admin)
 */
router.put(
  "/:id",
  authMiddleware.loginRequired,
  authMiddleware.isAdmin,
  orderController.updateOrderStatus
);

/**
 * @route DELETE api/orders/:id
 * @description Delete order (admin only)
 * @access Private (Admin)
 */
router.delete(
  "/:id",
  authMiddleware.loginRequired,
  authMiddleware.isAdmin,
  orderController.deleteOrder
);

module.exports = router;
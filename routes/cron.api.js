const express = require("express");
const router = express.Router();
const cronController = require("../controllers/cron.controller");

const verifyCronSecret = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") return next();
    return res.status(401).json({
      success: false,
      data: { error: "Cron secret not configured" },
      message: "Unauthorized",
    });
  }

  const provided = req.headers["x-cron-secret"] || req.query.secret;
  if (provided !== secret) {
    return res.status(401).json({
      success: false,
      data: { error: "Invalid cron secret" },
      message: "Unauthorized",
    });
  }

  return next();
};

router.get("/daily-discounts", verifyCronSecret, cronController.runDailyDiscounts);
router.post("/daily-discounts", verifyCronSecret, cronController.runDailyDiscounts);

module.exports = router;

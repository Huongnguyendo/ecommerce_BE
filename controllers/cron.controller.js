const { catchAsync, sendResponse } = require("../helpers/utils.helper");
const { setDailyDiscounts, getTodaysDeals } = require("../helpers/discount.helper");

const cronController = {};

cronController.runDailyDiscounts = catchAsync(async (req, res, next) => {
  const count = parseInt(req.query.count, 10) || undefined;
  const minDiscount = parseInt(req.query.min, 10) || undefined;
  const maxDiscount = parseInt(req.query.max, 10) || undefined;

  const updatedProducts = await setDailyDiscounts(count, minDiscount, maxDiscount);
  const deals = await getTodaysDeals();

  return sendResponse(
    res,
    200,
    true,
    {
      updatedCount: updatedProducts.length,
      dealsCount: deals.length,
    },
    null,
    "Daily discounts updated"
  );
});

module.exports = cronController;

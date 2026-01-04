const express = require('express');
const router = express.Router();
const { recommendForUser } = require('../helpers/recommendation');
const { attachUserIfExists } = require('../middlewares/authentication');
const User = require('../models/user');
const Product = require('../models/product');

// GET /api/recommendations - Get personalized product recommendations
router.get('/', attachUserIfExists, async (req, res) => {
  console.log('=== RECOMMENDATION ROUTE CALLED ===');
  console.log('req.userId:', req.userId);
  console.log('req.headers.authorization:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('req.user:', req.user);
  
  try {
    // If not authenticated, return trending products for guests
    if (!req.userId) {
      console.log('No userId found, returning TRENDING products for guest');
      try {
        // Aggregate total units sold per product across all sellers' sellingHistory
        const trending = await User.aggregate([
          { $unwind: "$sellingHistory" },
          { $unwind: "$sellingHistory.history" },
          { $group: { _id: "$sellingHistory.product", totalSold: { $sum: "$sellingHistory.history.quantity" } } },
          { $sort: { totalSold: -1 } },
          { $limit: 20 },
          {
            $lookup: {
              from: "products",
              let: { pid: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$_id", "$$pid"] },
                        { $ne: ["$isDeleted", true] }
                      ]
                    }
                  }
                }
              ],
              as: "product"
            }
          },
          { $unwind: "$product" },
          { $replaceRoot: { newRoot: "$product" } },
          { $limit: 12 }
        ]);
        if (trending && trending.length) {
          console.log('Trending products found (filtered non-deleted):', trending.length);
          return res.json({ success: true, data: trending, count: trending.length });
        }
      } catch (aggErr) {
        console.log('Trending aggregation failed, falling back to top-rated:', aggErr?.message);
      }

      // Fallback: top-rated or most recent products (exclude deleted)
      const fallbackTrending = await Product.find({ isDeleted: false })
        .sort({ rating: -1, createdAt: -1 })
        .limit(12)
        .lean();
      console.log('Fallback trending count:', fallbackTrending.length);
      return res.json({ success: true, data: fallbackTrending, count: fallbackTrending.length });
    }
    
    const userId = req.userId;
    console.log('Calling recommendForUser with userId:', userId);
    
    const recommendations = await recommendForUser(userId);
    console.log('Recommendations returned:', recommendations.length);
    
    res.json({ success: true, data: recommendations, count: recommendations.length });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations', error: error.message });
  }
});

module.exports = router; 
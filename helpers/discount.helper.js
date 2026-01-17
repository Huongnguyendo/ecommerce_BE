const Product = require('../models/product');

/**
 * Calculate the effective price of a product considering discounts
 * @param {Object} product - Product object with price, discountPercent, discountExpiresAt
 * @returns {Number} - Effective price after discount
 */
function getEffectivePrice(product) {
  if (!product) return 0;
  
  const now = new Date();
  const hasActiveDiscount = product.discountPercent > 0 && 
                           product.discountExpiresAt && 
                           product.discountExpiresAt > now;
  
  if (hasActiveDiscount) {
    const discountAmount = product.price * (product.discountPercent / 100);
    return Math.round((product.price - discountAmount) * 100) / 100; // Round to 2 decimal places
  }
  
  return product.price;
}

/**
 * Check if a product has an active discount
 * @param {Object} product - Product object
 * @returns {Boolean} - True if product has active discount
 */
function hasActiveDiscount(product) {
  if (!product) return false;
  
  const now = new Date();
  return product.discountPercent > 0 && 
         product.discountExpiresAt && 
         product.discountExpiresAt > now;
}

/**
 * Clear expired discounts from all products
 * @returns {Promise<Object>} - MongoDB update result
 */
async function clearExpiredDiscounts() {
  const now = new Date();
  return await Product.updateMany(
    { 
      discountExpiresAt: { $lte: now },
      discountPercent: { $gt: 0 }
    },
    { 
      $set: { discountPercent: 0 },
      $unset: { discountExpiresAt: 1 }
    }
  );
}

/**
 * Set daily random discounts on products
 * @param {Number} count - Number of products to discount (default: 5)
 * @param {Number} minDiscount - Minimum discount percentage (default: 10)
 * @param {Number} maxDiscount - Maximum discount percentage (default: 40)
 * @returns {Promise<Array>} - Array of updated products
 */
async function setDailyDiscounts(count = 5, minDiscount = 10, maxDiscount = 40) {
  try {
    // 1. Clear expired discounts
    await clearExpiredDiscounts();
    
    // 2. Get random eligible products
    const eligibleProducts = await Product.aggregate([
      {
        $match: {
          isDeleted: false,
          inStockNum: { $gt: 0 },
          $or: [
            { discountPercent: { $exists: false } }, // Products without discountPercent field
            { discountPercent: 0 } // Products with discountPercent = 0
          ]
        }
      },
      { $sample: { size: count } }
    ]);
    
    if (eligibleProducts.length === 0) {
      return [];
    }
    
    // 3. Set discounts on selected products
    const now = new Date();
    const discountExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const updatedProducts = [];
    
    for (const product of eligibleProducts) {
      const discountPercent = Math.floor(Math.random() * (maxDiscount - minDiscount + 1)) + minDiscount;
      
      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        {
          $set: {
            discountPercent: discountPercent,
            discountExpiresAt: discountExpiresAt
          }
        },
        { new: true }
      );
      
      updatedProducts.push(updatedProduct);
    }
    
    return updatedProducts;
    
  } catch (error) {
    console.error('Error in daily discount job:', error);
    throw error;
  }
}

/**
 * Get all products with active discounts (Today's Deals)
 * @returns {Promise<Array>} - Array of products with active discounts
 */
async function getTodaysDeals() {
  const now = new Date();
  
  const deals = await Product.find({
    isDeleted: false,
    discountPercent: { $gt: 0 },
    discountExpiresAt: { $gt: now }
  })
  .populate('category', 'name')
  .populate('seller', 'name')
  .sort({ discountPercent: -1 }); // Sort by highest discount first
  
  return deals;
}

module.exports = {
  getEffectivePrice,
  hasActiveDiscount,
  clearExpiredDiscounts,
  setDailyDiscounts,
  getTodaysDeals
};


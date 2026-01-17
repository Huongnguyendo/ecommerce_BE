/**
 * Enhance products with discount information
 * @param {Array} products - Array of products (Mongoose docs or plain objects)
 * @returns {Array} - Enhanced products with discount fields
 */
const { getEffectivePrice, hasActiveDiscount } = require("./discount.helper");

function enhanceProductsWithDiscounts(products) {
  const now = new Date();
  
  return products.map(product => {
    const productObj = product.toObject ? product.toObject() : product;
    const effectivePrice = getEffectivePrice(productObj);
    
    // Check if discount is active using the helper function
    const isDiscountActive = hasActiveDiscount(productObj);
    
    // Also check manually for products with discountPercent > 0
    const hasDiscountPercent = productObj.discountPercent > 0 && 
                                productObj.discountExpiresAt && 
                                new Date(productObj.discountExpiresAt) > now;
    
    // Calculate discount amount
    const calculatedDiscount = productObj.price - effectivePrice;
    const discountAmount = (isDiscountActive || hasDiscountPercent) ? calculatedDiscount : 0;
    
    // For products with discountPercent > 0, always set hasDiscount to true
    const hasDiscount = isDiscountActive || hasDiscountPercent || (productObj.discountPercent > 0);
    
    return {
      ...productObj,
      effectivePrice: (isDiscountActive || hasDiscountPercent) ? effectivePrice : productObj.price,
      hasDiscount: hasDiscount,
      originalPrice: productObj.price,
      discountAmount: discountAmount > 0 ? discountAmount : 0,
      discountPercent: productObj.discountPercent || 0
    };
  });
}

module.exports = {
  enhanceProductsWithDiscounts,
};


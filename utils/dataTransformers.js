/**
 * Utility functions for data transformation on the backend
 * Ensures consistent data handling and type safety
 */

/**
 * Safely extracts category name from populated category object
 * @param {string|object|null|undefined} category - Category value
 * @param {string} fallback - Fallback value if category is invalid
 * @returns {string} Category name as string
 */
const extractCategoryName = (category, fallback = 'N/A') => {
  if (!category) return fallback;
  
  if (typeof category === 'string') {
    return category;
  }
  
  if (typeof category === 'object' && category?.name) {
    return String(category.name);
  }
  
  return fallback;
};

/**
 * Normalizes product data to ensure category is always a string
 * @param {object} product - Product object
 * @returns {object} Product object with normalized category
 */
const normalizeProductCategory = (product) => {
  if (!product) return null;
  
  return {
    ...product,
    category: extractCategoryName(product.category)
  };
};

module.exports = {
  extractCategoryName,
  normalizeProductCategory
};


function extractCategoryName(category) {
  if (!category) return "N/A";
  if (typeof category === "string") return category;
  if (typeof category === "object") {
    if (category.name) return category.name;
    if (category.categoryName) return category.categoryName;
    if (category._id) return category._id.toString();
  }
  return "N/A";
}

module.exports = {
  extractCategoryName,
};

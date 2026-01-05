const Product = require("../models/product");

// Placeholder: returns 10 random products
async function recommendForUser(userId) {
  // TODO: Replace with real TensorFlow.js logic
  const count = await Product.countDocuments({ isDeleted: false });
  const randomSkip = Math.max(0, Math.floor(Math.random() * Math.max(1, count - 10)));
  const products = await Product.find({ isDeleted: false })
    .skip(randomSkip)
    .limit(10)
    .populate("seller");
  return products;
}

module.exports = { recommendForUser }; 
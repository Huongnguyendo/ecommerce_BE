const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Product = require("./product");

const reviewSchema = Schema(
  {
    user: { type: Schema.ObjectId, required: true, ref: "User" },
    rating: { type: Number, default: 5 },
    content: { type: String, required: true },
    product: { type: Schema.ObjectId, required: true, ref: "Product" },
  },
  { timestamps: true }
);

reviewSchema.statics.calculateReviews = async function (productId) {
    const reviews = await this.find({ product: productId });
    const reviewCount = reviews.length;
    
    // Calculate average rating - only if there are reviews
    let averageRating = null; // No default rating
    if (reviewCount > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = Math.round((totalRating / reviewCount) * 10) / 10; // Round to 1 decimal place
    }
    
    await Product.findByIdAndUpdate(productId, { 
      reviewCount: reviewCount,
      rating: averageRating
    });
  };
  
  reviewSchema.post("save", async function () {
    await this.constructor.calculateReviews(this.product);
  });

// Neither findByIdAndUpdate norfindByIdAndDelete have access to document middleware.
// They only get access to query middleware
// Inside this hook, this will point to the current query, not the current review.
// Therefore, to access the review, we’ll need to execute the query
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.doc = await this.findOne();
    next();
  });
  
  reviewSchema.post(/^findOneAnd/, async function (next) {
    await this.doc.constructor.calculateReviews(this.doc.blog);
  });

// Function to recalculate all product ratings (useful for existing data)
reviewSchema.statics.recalculateAllRatings = async function () {
  const products = await Product.find({});
  
  for (const product of products) {
    await this.calculateReviews(product._id);
  }
  
  console.log(`✅ Recalculated ratings for ${products.length} products`);
};

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
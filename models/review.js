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
    const reviewCount = await this.find({ product: productId }).countDocuments();
    await Product.findByIdAndUpdate(productId, { reviewCount: reviewCount });
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

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
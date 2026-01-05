const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const productSchema = Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  brand: { type: String, required: true },
  price: { type: Number, default: 0, required: true },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  inStockNum: { type: Number, default: 0, required: true },
  description: { type: String, required: true },
  rating: { type: Number, default: null, required: false },
  reviewCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false, select: false },
  discountPercent: { type: Number, default: 0, min: 0, max: 90 },
  discountExpiresAt: { type: Date },
  seller: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

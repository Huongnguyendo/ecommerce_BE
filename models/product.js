const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const productSchema = Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  brand: { type: String, required: true },
  price: { type: Number, default: 0, required: true },
  category: { type: String, required: true },
  inStockNum: { type: Number, default: 0, required: true },
  description: { type: String, required: true },
  rating: { type: Number, default: 0, required: true },
  reviewCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false, select: false },
  seller: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Seller",
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Merchant Schema
const SellerSchema = Schema({
  name: {
    type: String,
  },
  email: {
    type: String
  },
  avatarUrl: {type: String},
  brand: {
    type: String
  },
  business: {
    type: String,
  },
});

const Seller = mongoose.model('Seller', SellerSchema);

module.exports = Seller;

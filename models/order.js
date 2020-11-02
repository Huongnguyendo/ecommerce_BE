const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const orderItemSchema = Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  image: { type: String, required: true },
  price: { type: String, required: true },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
});

const orderSchema = Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderItems: [orderItemSchema],
  shipping: {
    address: { type: String, required: true },
    city: { type: String, required: true },
  },
  paymentMethod: { type: String, required: true },
  itemsPrice: { type: Number },
  shippingPrice: { type: Number },
  totalPrice: { type: Number },
  isPaid: { type: Boolean, default: false },
  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },
}, {
  timestamps: true
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
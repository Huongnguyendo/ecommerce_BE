const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cartItems: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, default: 1 },
            // price: { type: Number, required: true }
        }
    ]
}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
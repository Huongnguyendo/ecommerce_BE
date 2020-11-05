const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const historySchema = Schema({
    product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true},
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellingHistory: [
        {
            // product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true},
            buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            quantity: { type: Number },
            // price: { type: Number, required: true }
        }
    ]
}, { timestamps: true });

const History = mongoose.model("History", historySchema);
module.exports = History;

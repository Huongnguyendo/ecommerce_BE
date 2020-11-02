// const {
//     AppError,
//     catchAsync,
//     sendResponse,
//   } = require("../helpers/utils.helper");
// const User = require("../models/user");
// const Cart = require('../models/cart');
// const cartController = {};

// cartController.addItemToCart = catchAsync(async (req, res) => {
    
//     console.log("req.userId: ", req.userId)
//     const { cartItem } = req.body;
//     console.log("req.body: ", req.body);
    
//     let cart;
//     cart = await Cart.findOne({ user: req.userId });
//     if (!cart) {
//         cart = await Cart.create({
//             user: req.userId,
//             cartItems: [],
//         })
//     }
//     console.log("cart: ", cart);
//     let itemIndex = cart.cartItems.findIndex(item => item.product == cartItem.product);
//     if (itemIndex === -1) {
//         cart.cartItems.push(cartItem)
//     } else {
//         cart.cartItems[itemIndex].quantity += cartItem.quantity;
//     }
//     cart.save();
    
//     return sendResponse(res, 200, true, cart, null, "");

// });

// cartController.removeItemFromCart = catchAsync(async (req, res) => {
    
//     console.log("req.userId: ", req.userId)
//     const { cartItem } = req.body;
//     console.log("cartItem: ", cartItem);
    
//     let cart = await Cart.findOne({ user: req.userId });
    
//     console.log("cart: ", cart);
//     let itemIndex = cart.cartItems.findIndex(item => item.product == cartItem.product);
    
//     cart.cartItems[itemIndex].quantity -= cartItem.quantity;

//     if(cart.cartItems[itemIndex].quantity <= 0) {
//         cart.cartItems[itemIndex].quantity = 0;
//     }
    
//     cart.save();
    
//     return sendResponse(res, 200, true, cart, null, "");

// });



// module.exports = cartController;

const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
const User = require("../models/user");
const Cart = require('../models/cart');
const Product = require("../models/product")
const cartController = {};

cartController.getCart = catchAsync(async (req, res, next) => {
    let cart;
    cart = await Cart.findOne({ user: req.userId }).populate({path: "cartItems.product"})
    return sendResponse(res, 200, true, cart, null, "");
})


cartController.addItemToCart = catchAsync(async (req, res) => {
    // console.log("req.user: ", req);
    // find user
    console.log("req.userId: ", req.userId)
    const { product, quantity } = req.body;
    // let cartItem = { productId, quantity };
    // console.log("cartItem: ", cartItem);
    
    let cart;
    cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
        cart = await Cart.create({
            user: req.userId,
            cartItems: [],
        })
    }
    
    let itemIndex = cart.cartItems.findIndex(item => item && item.product == product);
    if (itemIndex === -1) {
        cart.cartItems.push({ product, quantity })
    } else {
        cart.cartItems[itemIndex].quantity += parseInt(quantity);
    }
    cart.save();
    console.log("cart: ", cart);
    return sendResponse(res, 200, true, cart, null, "");

});

cartController.decreaseQualityFromCart = catchAsync(async (req, res) => {
    // console.log("req.user: ", req);
    // find user
    console.log("req.userId: ", req.userId)
    const { product, quantity } = req.body;
    let cart = await Cart.findOne({ user: req.userId });
    
    console.log("cart: ", cart);
    let itemIndex = cart.cartItems.findIndex(item => item && item.product == product);
    console.log("itemIndex: ", itemIndex);
    cart.cartItems[itemIndex].quantity -= parseInt(quantity);

    if(cart.cartItems[itemIndex].quantity <= 0) {
        cart.cartItems[itemIndex].quantity = 0;
    }
    
    cart.save();
    
    return sendResponse(res, 200, true, cart, null, "");

});


cartController.removeItemFromCart = catchAsync(async (req, res) => {
    console.log("req.userId: ", req.userId)
    const { product } = req.body;
    console.log("product ne: ", product)
    let cart =  await Cart.findOne({ user: req.userId }).populate({path : "cartItems.product"})
    
    console.log("cart: ", cart);

    // console.log("cart.cartItems[0].product: ", cart.cartItems[0].product);
    // since filter returns an array
    let newCartItems = cart.cartItems.filter(item => item && item.product._id != product._id);
   
    cart.cartItems = newCartItems; 
    console.log("cart after filter: ", cart);
    cart.save();
    
    return sendResponse(res, 200, true, cart, null, "");

});


module.exports = cartController;

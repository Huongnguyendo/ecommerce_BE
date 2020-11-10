const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
const User = require("../models/user");
const Seller = require("../models/seller");
const Cart = require('../models/cart');
const Product = require("../models/product")
const cartController = {};

cartController.getCart = catchAsync(async (req, res, next) => {
    let cart;
    cart = await Cart.findOne({ user: req.userId, isCheckedout: false }).populate({path: "cartItems.product"})
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
    cart = await Cart.findOne({ user: req.userId, isCheckedout: false });
    if (!cart) {
        cart = await Cart.create({
            user: req.userId,
            cartItems: [],
            isCheckedout: false,
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
    let cart = await Cart.findOne({ user: req.userId, isCheckedout: false });
    
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
    let cart =  await Cart.findOne({ user: req.userId, isCheckedout: false }).populate({path : "cartItems.product"})
    
    console.log("cart: ", cart);

    // console.log("cart.cartItems[0].product: ", cart.cartItems[0].product);
    // since filter returns an array
    let newCartItems = cart.cartItems.filter(item => item && item.product._id != product._id);
   
    cart.cartItems = newCartItems; 
    console.log("cart after filter: ", cart);
    cart.save();
    
    return sendResponse(res, 200, true, cart, null, "");

});

cartController.checkoutCart = catchAsync(async (req, res) =>{
    let cart;
    console.log("user id ban dau: ", req.userId)
    cart = await Cart.findOne({ user: req.userId, isCheckedout: false }).populate({path: "cartItems.product"});
    // console.log("selected cart ne: ", cart);


    for(let item of cart.cartItems) {
        console.log("wowwow ", item.product.name);
        console.log("item.product.seller: ", item.product.seller);
        let seller = await User.findById( item.product.seller)
        if (!seller) continue;
        console.log("seller ne: ", seller);
        console.log(item._id,"ai di")

       let index =  await seller.sellingHistory.findIndex(pd => { 
        console.log("pd", pd.product)
        console.log("item", item.product._id)
        return pd.product.toString() == item.product._id.toString()})

        if (index < 0) {
           console.log("khong co")
            seller.sellingHistory.push({product: item.product._id, history: []})
            index = seller.sellingHistory.length - 1
        }

        console.log("hihi", index,"index")
        seller.sellingHistory[index].history.push({
            buyer: req.userId,
            quantity: item.quantity,
            price: item.product.price,
            purchaseDate: Date.now()
        })
        console.log(req.userId)
        console.log("seller 2222", seller)
        await seller.save()
    }

    cart.isCheckedout = true;
    cart.save();

    // console.log("post selected cart: ", cart);

    return sendResponse(res, 200, true, cart, null, "");
})


module.exports = cartController;

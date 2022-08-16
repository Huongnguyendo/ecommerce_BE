const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const User = require("../models/user");
const Seller = require("../models/seller");
const Cart = require("../models/cart");
const Product = require("../models/product");
const cartController = {};

cartController.getCart = catchAsync(async (req, res, next) => {
  let cart;
  cart = await Cart.findOne({ user: req.userId, isCheckedout: false }).populate(
    { path: "cartItems.product" }
  );
  return sendResponse(res, 200, true, cart, null, "");
});

cartController.addItemToCart = catchAsync(async (req, res) => {
  // find user

  // if(!req.userId) {
  //     return sendResponse(res, 400, false, null, "You have to login!");
  // }
  const { product, quantity, currentPrice } = req.body;

  let cart;
  cart = await Cart.findOne({ user: req.userId, isCheckedout: false });
  if (!cart) {
    cart = await Cart.create({
      user: req.userId,
      cartItems: [],
      isCheckedout: false,
    });
  }

  let itemIndex = cart.cartItems.findIndex(
    (item) => item && item.product == product
  );
  if (itemIndex === -1) {
    cart.cartItems.push({ product, quantity, currentPrice });
  } else {
    cart.cartItems[itemIndex].quantity += parseInt(quantity);
  }
  cart.save();

  return sendResponse(res, 200, true, cart, null, "");
});

cartController.removeItemFromCart = catchAsync(async (req, res) => {
  const { product } = req.body;
  let cart = await Cart.findOne({
    user: req.userId,
    isCheckedout: false,
  }).populate({ path: "cartItems.product" });

  // since filter returns an array
  let newCartItems = cart.cartItems.filter(
    (item) => item && item.product._id != product._id
  );

  cart.cartItems = newCartItems;
  cart.save();

  return sendResponse(res, 200, true, cart, null, "");
});

cartController.checkoutCart = catchAsync(async (req, res) => {
  let cart;
  cart = await Cart.findOne({ user: req.userId, isCheckedout: false }).populate(
    { path: "cartItems.product" }
  );

  // check to see if product is still in stock
  for (let item of cart.cartItems) {
    const product = await Product.findById(item.product._id);
    if (product.inStockNum < item.quantity) {
      return sendResponse(res, 400, false, null, null, "Stock limit exceeded");
    }
  }

  for (let item of cart.cartItems) {
    let seller = await User.findById(item.product.seller);
    if (!seller) continue;

    let index = await seller.sellingHistory.findIndex((pd) => {
      return pd.product.toString() == item.product._id.toString();
    });

    // that product is yet to exist in selling history
    if (index < 0) {
      seller.sellingHistory.push({ product: item.product._id, history: [] });
      index = seller.sellingHistory.length - 1; //?
    }
    await Product.update(
      { _id: item.product._id },
      { $inc: { inStockNum: -item.quantity } }
    );

    seller.sellingHistory[index].history.push({
      buyer: req.userId,
      quantity: item.quantity,
      price: item.currentPrice,
      purchaseDate: Date.now(),
    });

    await seller.save();
  }

  cart.isCheckedout = true;
  cart.save();

  return sendResponse(res, 200, true, cart, null, "");
});

module.exports = cartController;

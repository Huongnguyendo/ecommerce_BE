const express = require('express');
const { getCart, addItemToCart, decreaseQualityFromCart, removeItemFromCart, checkoutCart } = require('../controllers/cart.controller');
const authMiddleware = require("../middlewares/authentication");
const router = express.Router();

router.get('/', 
authMiddleware.loginRequired, 
getCart);

router.post('/add', 
authMiddleware.loginRequired, 
addItemToCart);

router.post('/remove', 
authMiddleware.loginRequired, 
removeItemFromCart);

router.post('/checkout', 
authMiddleware.loginRequired, 
checkoutCart);


module.exports = router;
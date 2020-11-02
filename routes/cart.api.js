const express = require('express');
const { getCart, addItemToCart, removeItemFromCart } = require('../controllers/cart.controller');
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


module.exports = router;
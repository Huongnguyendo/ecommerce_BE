const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
  const Product = require("../models/product");
  const Review = require("../models/review");
  const User = require("../models/user");
  const Seller = require("../models/seller");
  const productSellerController = {};
  
  
  productSellerController.getSingleProductForSeller = catchAsync(async (req, res, next) => {
    let product = await Product.findById(req.params.id).populate("seller").populate("user");
    let user = req.userId;
    console.log("here", user, product?.seller?._id )
    if(user != product?.seller?._id) {
      return sendResponse(res, 403, false, {error: "Unauthorized action"}, null, null);
    }

    if (!product)
      return next(new AppError(404, "Product not found", "Get Single Product Error"));
      product = product.toJSON();
      product.reviews = await Review.find({ product: product._id }).populate("seller").populate("user");
      console.log("product tra ve ne: ", product);
    return sendResponse(res, 200, true, product, null, null);
  });

  //get product by id for seller
  // check req.userId (trong middleware authentication) co = id cua owner cua product ko

productSellerController.getAllProductsForSeller = catchAsync(async (req, res, next) => {
    // let product = await Product.findById(req.params.id).populate("seller").populate("user");
    let user = req.userId;

    const products = await Product.find({seller: user})

    console.log("day ne: ", products )

    if (!products || !products.length)
      return next(new AppError(404, "Product not found", "Get Product Error"));
    //   products = products.toJSON();
    //   product.reviews = await Review.find({ product: product._id }).populate("seller").populate("user");
      // console.log("product tra ve ne: ", products);
    return sendResponse(res, 200, true, {products}, null, null);
})
  
  productSellerController.createNewProduct = catchAsync(async (req, res, next) => {
    const seller = req.userId;
    const { name, brand, description, category, inStockNum, image, price } = req.body;
  console.log(seller)
    const product = await Product.create({
      name,
      brand,
      description,
      category,
      inStockNum,
      image,
      price,
      seller,

    });
  
    return sendResponse(res, 200, true, product, null, "Create new product successful");
  });
  
  productSellerController.updateSingleProduct = catchAsync(async (req, res, next) => {
    const seller = req.userId;
    const productId = req.params.id;
    const { name, description, image, brand, price, category, inStockNum } = req.body;
    console.log("instock ne: ", inStockNum);
  
    const product = await Product.findOneAndUpdate(
      { _id: productId, seller: seller },
      { name, description, image, brand, price, category, inStockNum },
      { new: true }
    );
    if (!product)
      return next(
        new AppError(
          400,
          "Product not found or User not authorized",
          "Update Product Error"
        )
      );
    // product.save();
    return sendResponse(res, 200, true, product, null, "Update Product successful");
  });
  
  productSellerController.deleteSingleProduct = catchAsync(async (req, res, next) => {
    const seller = req.userId;
    const productId = req.params.id;
    
  
    const product = await Product.findOneAndUpdate(
      { _id: productId, seller: seller },
      { isDeleted: true },
      { new: true }
    );
    if (!product)
      return next(
        new AppError(
          400,
          "Product not found or User not authorized",
          "Delete Product Error"
        )
      );

    //   const products = await Product.find({ isDeleted: false },)
  
    // return sendResponse(res, 200, true, { products, totalPages }, null, "");

    return sendResponse(res, 200, true, null, null, "Delete Product successful");
  });
  
  module.exports = productSellerController;
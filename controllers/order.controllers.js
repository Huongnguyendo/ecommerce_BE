const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
  const Product = require("../models/product");
  const Review = require("../models/review");
  const User = require("../models/user");
  const Seller = require("../models/seller");
  const orderController = {};
  
  orderController.getCart = catchAsync(async (req, res, next) => {
    let { page, limit, sortBy, ...filter } = { ...req.query };
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
  
    const totalProducts = await Product.countDocuments({
      ...filter,
      isDeleted: false,
    });
    const totalPages = Math.ceil(totalProducts / limit);
    const offset = limit * (page - 1);
  
    // console.log({ filter, sortBy });
    const products = await Product.find(filter)
      .sort({ ...sortBy, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("seller")
      ;
  
    return sendResponse(res, 200, true, { products, totalPages }, null, "");
  });
  
  productController.getSingleProduct = catchAsync(async (req, res, next) => {
    let product = await (await Product.findById(req.params.id).populate("seller")).populate("user");
    if (!product)
      return next(new AppError(404, "Product not found", "Get Single Product Error"));
      product = product.toJSON();
      product.reviews = await Review.find({ product: product._id }).populate("seller").populate("user");
    return sendResponse(res, 200, true, product, null, null);
  });
  
  productController.createNewProduct = catchAsync(async (req, res, next) => {
    const seller = req.userId;
    const { name, description } = req.body;
    let { image } = req.body;
  
    const product = await Product.create({
      name,
      description,
      seller,
      images,
    });
  
    return sendResponse(res, 200, true, product, null, "Create new product successful");
  });
  
  productController.updateSingleProduct = catchAsync(async (req, res, next) => {
    const seller = req.userId;
    const productId = req.params.id;
    const { name, description } = req.body;
  
    const product = await Product.findOneAndUpdate(
      { _id: productId, seller: seller },
      { name, description },
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
    return sendResponse(res, 200, true, product, null, "Update Product successful");
  });
  
  productController.deleteSingleProduct = catchAsync(async (req, res, next) => {
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
    return sendResponse(res, 200, true, null, null, "Delete Product successful");
  });
  
  module.exports = productController;
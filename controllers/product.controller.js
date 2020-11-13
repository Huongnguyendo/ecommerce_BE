const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
  const Product = require("../models/product");
  const Review = require("../models/review");
  const User = require("../models/user");
  const Seller = require("../models/seller");
  const productController = {};
  
  productController.getProducts = catchAsync(async (req, res, next) => {

    let { page, limit, sortBy, ...filter } = { ...req.query };
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    // console.log("category o be ne: ", category);
  
    const totalProducts = await Product.countDocuments({
      ...filter,
      isDeleted: false,
    });
    const totalPages = Math.ceil(totalProducts / limit);
    const offset = limit * (page - 1);
  
    console.log("hihihihih",totalPages);
    const products = await Product.find({...filter,isDeleted:false})
      .sort({ ...sortBy, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("seller");
    // console.log(products)
    return sendResponse(res, 200, true, { products, totalPages }, null, "");
  });


  // productController.getProducts = catchAsync(async (req, res, next) => {
  //   let { page, limit, sortBy, ...filter } = { ...req.query };
  //   page = parseInt(page) || 1;
  //   limit = parseInt(limit) || 10;
  
  //   const totalProducts = await Product.countDocuments({
  //     ...filter,
  //     isDeleted: false,
  //   });
  //   const totalPages = Math.ceil(totalProducts / limit);
  //   const offset = limit * (page - 1);
  
  //   console.log("hihihihih",totalPages);
  //   const products = await Product.find({...filter,isDeleted:false})
  //     .sort({ ...sortBy, createdAt: -1 })
  //     .skip(offset)
  //     .limit(limit)
  //     .populate("seller");
  //   // console.log(products)
  //   return sendResponse(res, 200, true, { products, totalPages }, null, "");
  // });



  productController.getProductsByKeyword = catchAsync(async (req, res, next) => {
    console.log("hehehehehe");
    let { page, limit, sortBy,  ...filter } = { ...req.query };
    let { keyword } = req.body;
    keyword = keyword.toLowerCase();

    
    const products = await Product.find({
      $or: [
        {"name" : {$regex : `.*${keyword}.*`,  $options: "i"}},
        {"category" : {$regex : `.*${keyword}.*`, $options: "i"}}
      ]
    })
    .sort({ ...sortBy, createdAt: -1 })
    // .skip(offset)
    // .limit(limit)
    .populate("seller");

  
    return sendResponse(res, 200, true, { products }, null, "");
  })

  productController.getProductsWithCategory = catchAsync(async(req, res, next) => {
    try {
      
        const category = req.body.category;
        console.log("category hoho: ", category);
        
        let filterProducts;
        if (!category || category === "All") {
            filterProducts = await Product.find().populate("seller");
        } else {
            filterProducts = await Product.find({ category: category }).populate("seller");
        }
        return sendResponse(res,200,true,filterProducts,null,
        "Get products in category successful");
    } catch (err) {
        return new AppError(404, "Products not found");
    }
    
})
 
  
  productController.getSingleProduct = catchAsync(async (req, res, next) => {
    let product = await Product.findById(req.params.id).populate("seller").populate("user");
    if (!product)
      return next(new AppError(404, "Product not found", "Get Single Product Error"));
      product = product.toJSON();
      product.reviews = await Review.find({ product: product._id }).populate("seller").populate("user");
    return sendResponse(res, 200, true, product, null, null);
  });

  productController.getSingleProductForSeller = catchAsync(async (req, res, next) => {
    let product = await Product.findById(req.params.id).populate("seller").populate("user");
    let user = req.userId;
    // console.log("here", user, product?.seller?._id )
    if(user != product?.seller?._id) {
      // return next(new AppError(401, "Unauthori÷zed action", "Auth Error"));
      return sendResponse(res, 403, false, {error: "Unauthorized action"}, null, null);
    }

    if (!product)
      return next(new AppError(404, "Product not found", "Get Single Product Error"));
      product = product.toJSON();
      product.reviews = await Review.find({ product: product._id }).populate("seller").populate("user");
      // console.log("product tra ve ne: ", product);
    return sendResponse(res, 200, true, product, null, null);
  });

  //get product by id for seller
  // check req.userId (trong middleware authentication) co = id cua owner cua product ko

  
  productController.createNewProduct = catchAsync(async (req, res, next) => {
    const seller = req.userId;
    console.log("seller ne: ", req.userId);
    const { name, brand, description, category, inStockNum, image, price } = req.body;
  
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
  
  productController.updateSingleProduct = catchAsync(async (req, res, next) => {
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

    //   const products = await Product.find({ isDeleted: false },)
  
    // return sendResponse(res, 200, true, { products, totalPages }, null, "");

    return sendResponse(res, 200, true, null, null, "Delete Product successful");
  });
  
  module.exports = productController;
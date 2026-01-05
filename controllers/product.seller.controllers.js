const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const Product = require("../models/product");
const Review = require("../models/review");
const User = require("../models/user");
const Seller = require("../models/seller");
const { extractCategoryName } = require("../utils/dataTransformers");
const productSellerController = {};

productSellerController.getSingleProductForSeller = catchAsync(
  async (req, res, next) => {
    let product = await Product.findById(req.params.id)
      .populate("seller")
      .populate("user");
    let user = req.userId;
    if (user != product?.seller?._id) {
      return sendResponse(
        res,
        403,
        false,
        { error: "Unauthorized action" },
        null,
        null
      );
    }

    if (!product)
      // return next(
      //   new AppError(404, "Product not found", "Get Single Product Error")
      // );
      return sendResponse(
        res,
        404,
        false,
        { error: "Product not found" },
        null,
        null
      );
    product = product.toJSON();
    product.reviews = await Review.find({ product: product._id })
      .populate("seller")
      .populate("user");
    return sendResponse(res, 200, true, product, null, null);
  }
);

//get product by id for seller
// check req.userId (in middleware authentication) to see if id = prduct owner id

productSellerController.getAllProductsForSeller = catchAsync(
  async (req, res, next) => {
    // let product = await Product.findById(req.params.id).populate("seller").populate("user");
    let user = req.userId;

    // Check if seller is approved
    const sellerUser = await User.findById(user);
    if (!sellerUser || !sellerUser.isApproved) {
      return sendResponse(
        res,
        403,
        false,
        { error: "Seller account not approved. Please wait for admin approval." },
        null,
        null
      );
    }

    const products = await Product.find({ seller: user, isDeleted: false })
      .populate("category", "name");

    if (!products)
      // return next(new AppError(404, "Product not found", "Get Product Error"));
      return sendResponse(
        res,
        400,
        false,
        { error: "Product not found" },
        null,
        null
      );
    //   products = products.toJSON();
    //   product.reviews = await Review.find({ product: product._id }).populate("seller").populate("user");
    return sendResponse(res, 200, true, { products }, null, null);
  }
);

productSellerController.getHistoryForSeller = catchAsync(
  async (req, res, next) => {
    let userId = req.userId;
    
    // Query user with explicit isDeleted check to bypass plugin filtering
    let user = await User.findOne({ _id: userId, isDeleted: { $in: [true, false] } })
      .lean();

    if (!user) {
      return sendResponse(
        res,
        404,
        false,
        { error: "User not found" },
        null,
        null
      );
    }

    // Manually populate products and buyers, including deleted ones
    const sellingHistory = user.sellingHistory || [];
    const populatedHistory = await Promise.all(
      sellingHistory.map(async (item) => {
        // Populate product (including deleted products)
        const product = await Product.findOne({ 
          _id: item.product,
          isDeleted: { $in: [true, false] }
        })
          .populate("category", "name")
          .lean();

        // Populate buyers for each history entry
        const populatedHistoryItems = await Promise.all(
          (item.history || []).map(async (historyItem) => {
            const buyer = await User.findOne({ 
              _id: historyItem.buyer,
              isDeleted: { $in: [true, false] }
            })
              .select("name email")
              .lean();

            return {
              ...historyItem,
              buyer: buyer || { _id: historyItem.buyer, name: 'Deleted User', email: '' }
            };
          })
        );

        return {
          ...item,
          product: product ? {
            ...product,
            category: extractCategoryName(product.category)
          } : {
            _id: item.product,
            name: 'Product Deleted',
            image: '',
            category: 'N/A',
            brand: 'N/A',
            isDeleted: true
          },
          history: populatedHistoryItems
        };
      })
    );

    return sendResponse(res, 200, true, populatedHistory, null, null);
  }
);

productSellerController.createNewProduct = catchAsync(
  async (req, res, next) => {
    const seller = req.userId;
    
    // Check if seller is approved
    const sellerUser = await User.findById(seller);
    if (!sellerUser || !sellerUser.isApproved) {
      return sendResponse(
        res,
        403,
        false,
        { error: "Seller account not approved. Please wait for admin approval." },
        null,
        null
      );
    }
    
    const { name, brand, description, category, inStockNum, image, price } =
      req.body;
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

    return sendResponse(
      res,
      200,
      true,
      product,
      null,
      "Create new product successful"
    );
  }
);

productSellerController.updateSingleProduct = catchAsync(
  async (req, res, next) => {
    const seller = req.userId;
    const productId = req.params.id;
    const { name, description, image, brand, price, category, inStockNum } =
      req.body;

    const product = await Product.findOneAndUpdate(
      { _id: productId, seller: seller },
      { name, description, image, brand, price, category, inStockNum },
      { new: true }
    );
    if (!product)
      // return next(
      //   new AppError(
      //     400,
      //     "Product not found or User not authorized",
      //     "Update Product Error"
      //   )
      // );
      return sendResponse(
        res,
        400,
        false,
        { error: "Product not found or User not authorized" },
        null,
        null
      );
    // product.save();
    return sendResponse(
      res,
      200,
      true,
      product,
      null,
      "Update Product successfully"
    );
  }
);

productSellerController.deleteSingleProduct = catchAsync(
  async (req, res, next) => {
    const seller = req.userId;
    const productId = req.params.id;

    const product = await Product.findOneAndUpdate(
      { _id: productId, seller: seller },
      { isDeleted: true },
      { new: true }
    );
    if (!product)
      // return next(
      //   new AppError(
      //     400,
      //     "Product not found or User not authorized",
      //     "Delete Product Error"
      //   )
      // );
      return sendResponse(
        res,
        400,
        false,
        { error: "Product not found or User not authorized" },
        null,
        null
      );

    //   const products = await Product.find({ isDeleted: false },)

    // return sendResponse(res, 200, true, { products, totalPages }, null, "");

    return sendResponse(
      res,
      200,
      true,
      null,
      null,
      "Delete Product successful"
    );
  }
);

module.exports = productSellerController;

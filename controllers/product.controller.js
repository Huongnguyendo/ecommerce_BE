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
const tfRecommendation = require("../helpers/tfrecommendation.js");
const mongoose = require("mongoose");
const Category = require("../models/category");
const { getTodaysDeals } = require("../helpers/discount.helper");
const { enhanceProductsWithDiscounts } = require("../helpers/product.helper");


productController.getProducts = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, category, search, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  // Record recent search (non-blocking for performance)
  const q = (search || '').trim();
  if (req.userId && q && q.length >= 2) {
    User.findById(req.userId).then(user => {
      if (user) {
        user.recentSearches = user.recentSearches || [];
        user.recentSearches = user.recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase());
        user.recentSearches.unshift(q);
        if (user.recentSearches.length > 20) user.recentSearches = user.recentSearches.slice(0, 20);
        user.save().catch(() => {}); // Non-blocking
      }
    }).catch(() => {}); // Silently handle error
  }

  // Search filter: search in name, description, and brand
  if (search && search.trim()) {
    const searchTerm = search.trim();
    filter.$or = [
      { name: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
      { brand: { $regex: searchTerm, $options: "i" } },
    ];
  }

  // Flexible category filter: support both ObjectId and name
  if (category) {
    let categoryId = null;
    // Try to interpret as ObjectId
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryId = category;
    } else {
      // Try to look up by name
      const categoryDoc = await Category.findOne({ name: category });
      if (categoryDoc) {
        categoryId = categoryDoc._id;
      }
    }
    if (categoryId) {
      filter.category = categoryId;
    } else {
      // No such category, return empty result
      return sendResponse(res, 200, true, { products: [], totalPages: 0 }, null, "");
    }
  }

  const totalProducts = await Product.countDocuments({
    ...filter,
    isDeleted: false,
  });
  const totalPages = Math.ceil(totalProducts / limit);
  const offset = limit * (page - 1);

  const products = await Product.find({ ...filter, isDeleted: false })
    // .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate("seller", "name email avatarUrl")
    .lean();
  
  // Enhance products with discount information
  const enhancedProducts = enhanceProductsWithDiscounts(products);
  
  return sendResponse(res, 200, true, { products: enhancedProducts, totalPages }, null, "");
});

productController.getSingleProduct = catchAsync(async (req, res, next) => {
  // Fetch product only (reviews are loaded separately for faster response)
  const product = await Product.findById(req.params.id)
    .populate("seller", "name email avatarUrl")
    .lean();
  
  if (!product)
    return sendResponse(
      res,
      404,
      false,
      { error: "Product not found" },
      null,
      null
    );

  // Record recent view for authenticated users (non-blocking)
  if (req.userId) {
    User.findById(req.userId).then(user => {
      if (user) {
        user.recentViews = user.recentViews || [];
        const pid = product._id.toString();
        user.recentViews = user.recentViews.filter(id => id.toString() !== pid);
        user.recentViews.unshift(product._id);
        if (user.recentViews.length > 20) user.recentViews = user.recentViews.slice(0, 20);
        user.save().catch(() => {});
      }
    }).catch(() => {});
  }
  
  // Enhance product with discount information
  const enhancedProduct = enhanceProductsWithDiscounts([product])[0];
  
  return sendResponse(res, 200, true, enhancedProduct, null, null);
});

productController.getProductReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ product: req.params.id })
    .populate("seller", "name email avatarUrl")
    .populate("user", "name email avatarUrl")
    .lean()
    .limit(50);

  return sendResponse(res, 200, true, reviews || [], null, null);
});

productController.getSingleProductForSeller = catchAsync(
  async (req, res, next) => {
    let product = await Product.findById(req.params.id)
      .populate("seller")
      .populate("user");
    let user = req.userId;
    if (user != product?.seller?._id) {
      // return next(new AppError(401, "Unauthorized action", "Auth Error"));
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
        400,
        false,
        { error: "Product not found" },
        { error: "Get Single Product Error" },
        null
      );
    product = product.toJSON();
    product.reviews = await Review.find({ product: product._id })
      .populate("seller")
      .populate("user");
    
    // Enhance product with discount information
    const enhancedProduct = enhanceProductsWithDiscounts([product])[0];
    
    return sendResponse(res, 200, true, enhancedProduct, null, null);
  }
);

// get product by id for seller
// check req.userId (in middleware authentication) equals id of product owner??

productController.createNewProduct = catchAsync(async (req, res, next) => {
  const seller = req.userId;
  const { name, brand, description, category, inStockNum, image, price } =
    req.body;

  // Validate required fields
  if (!name || !brand || !description || !category || !image) {
    return sendResponse(
      res,
      400,
      false,
      { error: "Missing required fields: name, brand, description, category, and image are required" },
      null,
      null
    );
  }

  // Validate numeric fields
  if (price === undefined || price === null || isNaN(price) || price < 0) {
    return sendResponse(
      res,
      400,
      false,
      { error: "Price must be a valid positive number" },
      null,
      null
    );
  }

  if (inStockNum === undefined || inStockNum === null || isNaN(inStockNum) || inStockNum < 0) {
    return sendResponse(
      res,
      400,
      false,
      { error: "Stock quantity must be a valid positive number" },
      null,
      null
    );
  }

  // Handle category: can be ObjectId or category name
  let categoryId = null;
  if (mongoose.Types.ObjectId.isValid(category)) {
    // It's already an ObjectId
    categoryId = category;
  } else {
    // It's a category name, look it up
    const categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) {
      return sendResponse(
        res,
        400,
        false,
        { error: `Category "${category}" not found. Please select a valid category.` },
        null,
        null
      );
    }
    categoryId = categoryDoc._id;
  }

  // Check if seller is approved (if seller role)
  const sellerUser = await User.findById(seller);
  if (sellerUser && sellerUser.role === 'Seller' && !sellerUser.isApproved) {
    return sendResponse(
      res,
      403,
      false,
      { error: "Seller account not approved. Please wait for admin approval." },
      null,
      null
    );
  }

  try {
    const product = await Product.create({
      name,
      brand,
      description,
      category: categoryId, // Use the resolved categoryId (ObjectId)
      inStockNum: parseInt(inStockNum),
      image,
      price: parseFloat(price),
      seller,
    });

    return sendResponse(
      res,
      200,
      true,
      product,
      null,
      "Create new product successfully"
    );
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendResponse(
        res,
        400,
        false,
        { error: "Validation error", details: errors },
        null,
        null
      );
    }
    // Re-throw other errors to be caught by catchAsync
    throw error;
  }
});

productController.updateSingleProduct = catchAsync(async (req, res, next) => {
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
      { error: "Update Product Error" },
      null
    );
  // await product.save();
  return sendResponse(
    res,
    200,
    true,
    product,
    null,
    "Update Product successfully"
  );
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

  return sendResponse(res, 200, true, null, null, "Delete Product successful");
});

productController.recommendedProductsHandler = catchAsync(async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return sendResponse(res, 404, false, null, null, "User not found");
    }
    // Call the core recommendation function
    const tfProducts = await tfRecommendation.recommendForUser(userId);
    const recommendations = tfProducts?.slice(0, 10) || [];
    if (recommendations.length <= 2) {
      // Fallback: top-rated products
      const fallbackProducts = await Product.find({ rating: { $gte: 4 }, isDeleted: false })
        .populate("seller")
        .limit(10);
      return sendResponse(res, 200, true, { products: fallbackProducts }, null, "Fallback: showing top-rated products");
    }
    return sendResponse(res, 200, true, { products: recommendations }, null, "Recommended products generated with TensorFlow");
  } catch (error) {
    console.error("TF Recommendation error:", error);
    return sendResponse(res, 500, false, null, error, "Server error");
  }
});

productController.getTodaysDeals = catchAsync(async (req, res, next) => {
  try {
    const deals = await getTodaysDeals();
    const enhancedDeals = enhanceProductsWithDiscounts(deals);
    
    return sendResponse(res, 200, true, { products: enhancedDeals }, null, "Today's deals retrieved successfully");
  } catch (error) {
    console.error("Get today's deals error:", error);
    return sendResponse(res, 500, false, null, error, "Server error");
  }
});

module.exports = productController;
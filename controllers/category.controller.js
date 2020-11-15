const {
    AppError,
    catchAsync,
    sendResponse,
  } = require("../helpers/utils.helper");
const Category = require('../models/category');
const Product = require('../models/product');
const categoryController = {};

categoryController.getCategories = catchAsync(async(req, res, next) => {
    try {
        const categories = await Category.find()
        return sendResponse(res,200,true,categories,null,
            "Get category successful");
    } catch (err) {
        return new AppError(404, "Category not found");
    }
    
})

categoryController.getProductsWithCategory = catchAsync(async(req, res, next) => {
    try {
        const category = req.body.category;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        
        
        let filterProducts;
        if (!category || category === "All") {
            filterProducts = await Product.find().populate("seller");
        } else {
            filterProducts = await Product.find({ category: category }).populate("seller");
        }

        const totalPages = Math.ceil(filterProducts / limit);
        const offset = limit * (page - 1);

        const products = await filterProducts
        .sort({ ...sortBy, createdAt: -1 })
        .skip(offset)
        .limit(limit)
        // .populate("seller");

        return sendResponse(res,200,true,{products, totalPages},null,
        "Get products in category successful");
    } catch (err) {
        return new AppError(404, "Products not found");
    }
    
})
    
// categoryController.createCategory =  catchAsync(async(req, res, next) =>{
//         try {
//             // if user have role = 1 ---> admin
//             // only admin can create , delete and update category
//             const {name} = req.body;
//             const category = await Category.findOne({name})
//             if(category) return res.status(400).json({msg: "This category already exists."})

//             const newCategory = new Category({name})

//             await newCategory.save()
//             res.json({msg: "Created a category"})
//         } catch (err) {
//             return res.status(500).json({msg: err.message})
//         }
//     })

// categoryController.deleteCategory = catchAsync(async(req, res, next) =>{
//         try {
//             const products = await Products.findOne({category: req.params.id})
//             if(products) return res.status(400).json({
//                 msg: "Please delete all products with a relationship."
//             })

//             await Category.findByIdAndDelete(req.params.id)
//             res.json({msg: "Deleted a Category"})
//         } catch (err) {
//             return res.status(500).json({msg: err.message})
//         }
//     })

// categoryController.updateCategory = catchAsync(async(req, res, next) =>{
//         try {
//             const {name} = req.body;
//             await Category.findOneAndUpdate({_id: req.params.id}, {name})

//             res.json({msg: "Updated a category"})
//         } catch (err) {
//             return res.status(500).json({msg: err.message})
//         }
//     })



module.exports = categoryController;
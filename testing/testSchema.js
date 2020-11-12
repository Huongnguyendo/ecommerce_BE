const mongoose = require("mongoose");
const User = require("../models/user");
const Seller = require("../models/seller");
const Product = require("../models/product");
const Review = require("../models/review");
const Category = require("../models/category");
const faker = require("faker");
const bcrypt = require("bcryptjs");

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const cleanData = async (startTime) => {
  try {
    // await Seller.collection.drop();
    await Product.collection.drop();
    await Review.collection.drop();
    await User.collection.drop();
    await Category.collection.drop();
    // OR: await mongoose.connection.dropDatabase();
    console.log("| Deleted all data");
    console.log("-------------------------------------------");
  } catch (error) {
    console.log(error);
  }
};

const generateData = async () => {
  try {
    await cleanData();
    let sellers = [];
    let users = []
    let products = [];
    console.log("| Create 10 sellers:");
    console.log("-------------------------------------------");
    const sellerNum = 10;
    const userNum = 10;
    const otherNum = 3; // num of product each seller, reviews or reactions each product
    for (let i = 0; i < sellerNum; i++) {
      const salt = await bcrypt.genSalt(10);
      const password = await bcrypt.hash("123", salt);
      await User.create({
        name: faker.name.findName(),
        password,
        email: faker.internet.email().toLowerCase(),
        avatarUrl: faker.image.avatar(),
        brand: faker.random.word(),
        business: faker.random.words(),
      }).then(function (seller) {
        console.log("Created new seller: " + seller.name);
        sellers.push(seller);
      });
    }

    for (let i = 0; i < userNum; i++) {
      const salt = await bcrypt.genSalt(10);
      const password = await bcrypt.hash("123", salt);
      await User.create({
        name: faker.name.findName(),
        email: faker.internet.email().toLowerCase(),
        password,
        avatarUrl: faker.image.avatar(),
      }).then(function (user) {
        console.log("Created new user: " + user.name);
        users.push(user);
      });
    }

    let categories = ["Fashion", "Phones and Accessories", "Electronic device ", "Household goods",
"Home and Life", "Health and Life", "Fashion Accessories", "Books"]

    let productPics = ["https://cf.shopee.vn/file/3bfcbcacc6ac23707ab1e706cec0e2d8_tn",
    "https://cf.shopee.vn/file/6e0925121b0e6342b72df328d5a6115c",
    "https://cf.shopee.vn/file/c2aef100d3096bc99100dac4cda15ca1",
    "https://cf.shopee.vn/file/a04b8e73af502e46dcac59dc923b7130",
    "https://cf.shopee.vn/file/1b37f8d0b32225fff5cab87a556ac135_tn",
    "https://cf.shopee.vn/file/d0fcae643984dbe62f6efd027763567d",
    "https://cf.shopee.vn/file/d4594c763c2a98448bd4cbce95ac015b",
    "https://cf.shopee.vn/file/3cdbe531716013bfed73a6f38679bf66_tn",
    "https://cf.shopee.vn/file/e363939ba4ba11e55d09cc88f9e06ba7",
    "https://cf.shopee.vn/file/cbe25fdec4eb1311883d622106282b76_tn",
    "https://cf.shopee.vn/file/a6f4ed2ae41515b799602a6a8a459adf",
    "https://cf.shopee.vn/file/c4fb6e81787df938f573798c02a86886",
    "https://cf.shopee.vn/file/1553529b098197d0493e41cde92c011e_tn",
    "https://cf.shopee.vn/file/d168a64934c79b21b7aeabbed2dd786c_tn",
    "https://cf.shopee.vn/file/baa6bf0f0db1fe474a5ab815ec189f25_tn",
    "https://cf.shopee.vn/file/7b5add075ff255b990474f42a7a5ef12_tn",
    "https://cf.shopee.vn/file/74dbcfd9eaafd456a45d2b66bacdc4c9_tn",
    "https://cf.shopee.vn/file/150c35fd0874f47bfed85a3f4f740bac_tn",
    "https://cf.shopee.vn/file/508a900e820a5a93446e2a4fb7a6dbd3_tn",
    "https://cf.shopee.vn/file/a68f7f7bec9497ec86d09d6402b94fd2"]
// let categories = []

    // for (let i = 0; i < 10; i++) {
    //   await Category.create({
    //     name: faker.commerce.product(),
    //   }).then(function (category) {
    //     console.log("Created new category: " + category.name);
    //     if(!categories.includes(category)) {
    //       categories.push(category);
    //     }
    //   });
    // }
    
    console.log(`| Each seller writes ${otherNum} products`);
    console.log("-------------------------------------------");
    for (let i = 0; i < sellerNum; i++) {
      for (let j = 0; j < otherNum; j++) {
        await Product.create({
          name: faker.commerce.productName(),
          image: productPics[Math.floor(Math.random() * productPics.length)],
          price: faker.commerce.price(),
          brand: faker.company.companyName(),
          category: categories[Math.floor(Math.random() * categories.length)],
          inStockNum: Math.floor(Math.random() * 100),
          description: faker.commerce.productDescription(),
          rating: Math.floor(Math.random() * 4) + 2,
          reviewCount: Math.floor(Math.random() * 30),
          seller: sellers[i]._id,
        }).then(async (product) => {
          console.log("Created product:" + product.name);
          console.log("Created seller:" + product.seller);
          products.push(product);
          
          console.log(
            `| Each product has ${otherNum} reviews from ${otherNum} random users`
          );
          console.log("-------------------------------------------");
          // for (let l = 0; l < userNum; l++) {
            for (let k = 0; k < otherNum; k++) {
              await Review.create({
                content: faker.commerce.productAdjective(),
                // seller: sellers[getRandomInt(0, sellerNum - 1)]._id,
                rating: Math.floor(Math.random() * 4) + 2,
                product: product._id,
                user: users[getRandomInt(0, userNum - 1)]._id,
              });
            // }
          }
          

        });
      }
    }
    console.log("| Generate Data Done");
    console.log("-------------------------------------------");
  } catch (error) {
    console.log(error);
  }
};

const getRandomProducts = async (productNum) => {
  console.log(`Get ${productNum} random products`);
  const totalProductNum = await Product.countDocuments();
  for (let i = 0; i < productNum; ++i) {
    const product = await Product.findOne()
      .skip(getRandomInt(0, totalProductNum - 1))
      .populate("seller").populate("user");
    console.log(product);
  }
};

const main = async (resetDB = false) => {
  if (resetDB) await generateData();
  getRandomProducts(1);
};

// remove true if you don't want to reset the DB
main(true);
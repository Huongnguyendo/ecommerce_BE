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
    await Seller.collection.drop();
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
      await Seller.create({
        name: faker.name.findName(),
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

    let categories = ["Fashion", "Phones & Accessories", "Electronic device ", "Household goods",
"Home & Life", "Health & Life", "Fashion Accessories", "Books"]
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
          image: faker.image.imageUrl(400, 300),
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
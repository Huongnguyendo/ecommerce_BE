// 1.
const utilsHelper = require("../helpers/utils.helper");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

// 2.
const userSchema = Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String, required: true },
    avatarUrl: { type: String },
    role: {
      type: String,
      default: "User",
      enum: ["User", "Admin", "Seller", "Shipper"],
      // required: true,
    },
    isApproved: {
      type: Boolean,
      default: function() {
        // Sellers need approval, other roles are auto-approved
        return this.role !== "Seller";
      }
    },
    // seller: { type: Schema.ObjectId, ref: "Seller" },
    sellingHistory: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        history: [
          {
            // orderID: {type: mongoose.Schema.Types.ObjectId, ref: 'Cart'},
            buyer: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            quantity: { type: Number },
            price: Number,
            address: String,
            purchaseDate: Date,
          },
        ],
      },
    ],
    isActive: { type: Boolean, default: true }, // Active/Inactive status (can be toggled)
    isDeleted: { type: Boolean, default: false, select: false }, // Permanent deletion (soft delete)
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    preferences: {
      categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    },
    interactions: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        type: { type: String, enum: ["view", "cart", "rating", "buy"] },
        timestamp: { type: Date, default: Date.now },
        category: { type: Schema.Types.ObjectId, ref: "Category" }, // Add category ID
        categoryName: { type: String }, // Add category name for debugging
      },
    ],
    recentViews: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    recentSearches: [{ type: String }],
    // cart: [{type: Schema.Types.ObjectId,
    //   ref: "Product"}]
  },
  { timestamps: true },
  { toJSON: { virtuals: true } },
  { toObject: { virtuals: true } }
);

// cart: [2,3,4,5,5]

userSchema.plugin(require("./plugins/isDeletedFalse"));

// 4. the .methods are added later if needed
userSchema.methods.toJSON = function () {
  const obj = this._doc;
  delete obj.password;
  delete obj.isDeleted; // Hide isDeleted from JSON (soft delete field)
  // Keep isActive in JSON so frontend can check account status
  return obj;
};

userSchema.methods.generateToken = async function () {
  const accessToken = await jwt.sign({ _id: this._id }, JWT_SECRET_KEY, {
    expiresIn: "10d",
  });
  return accessToken;
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;

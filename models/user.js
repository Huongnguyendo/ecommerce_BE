// 1.
const utilsHelper = require("../helpers/utils.helper");
const emailHelper = require("../helpers/email.helper");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;


// 2.
const userSchema = Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String, required: true, unique: true,
    },
    password: { type: String, required: true },
    avatarUrl: {type: String, required: true},
    role: {
      type: String,
      default: 'User',
      enum: ['User', 'Admin', 'Seller', 'Shipper']
    },
    isDeleted: { type: Boolean, default: false, select: false },
    cart: [{type: Schema.Types.ObjectId,
      ref: "Product"}]
  },
  { timestamps: true },
  {toJSON: {virtuals: true}},
  {toObject: {virtuals: true}},
);

userSchema.plugin(require("./plugins/isDeletedFalse"));

// 4. the .methods are added later if needed
userSchema.methods.toJSON = function () {
  
  const obj = this._doc; 
  delete obj.password;
  delete obj.isDeleted;
  return obj;
};

// userSchema.methods.generateToken = async function () {
//   const accessToken = await jwt.sign({ _id: this._id }, JWT_SECRET_KEY, {
//     expiresIn: "1d",
//   });
//   return accessToken;
// };

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;

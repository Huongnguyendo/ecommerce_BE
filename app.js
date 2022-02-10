var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require("cors");
require("dotenv").config();
var indexRouter = require("./routes/index");
require("./helpers/passport.helper");
const passport = require("passport");
const utilsHelper = require("./helpers/utils.helper");

// const mongoURI = process.env.URI

// 0. set up mongoose
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true })
  .catch((err) => console.log(err));

const db = mongoose.connection;
db.once("open", function () {
  console.log("MongoDB database connection established successfully!");
  // require("./testing/testSchema");
});

var app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(passport.initialize());
app.use("/api", indexRouter);

// catch 404 and forard to error handler
// app.use((req, res, next) => {
//   const err = new Error("Not Found");
//   err.statusCode = 404;
//   next(err);
// });

/* Initialize Error Handling */
// app.use((err, req, res, next) => {
//   console.log("ERROR", err);
//   if (err.isOperational) {
//     return utilsHelper.sendResponse(
//       res,
//       err.statusCode ? err.statusCode : 500,
//       false,
//       null,
//       { message: err.message },
//       err.errorType
//     );
//   } else {
//     return utilsHelper.sendResponse(
//       res,
//       err.statusCode ? err.statusCode : 500,
//       false,
//       null,
//       { message: err.message },
//       "Internal Server Error"
//     );
//   }
// });

module.exports = app;

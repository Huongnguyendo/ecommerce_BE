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
const cronService = require("./services/cronService");

// const mongoURI = process.env.URI

// 0. set up mongoose
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URI, { 
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  })
  .catch((err) => console.log("MongoDB connection error:", err));

const db = mongoose.connection;
db.once("open", async function () {
  console.log("MongoDB database connection established successfully!");
  // require("./testing/testSchema");
  
  // Start the daily discount cron job (will run immediately if no deals exist)
  await cronService.startDailyDiscountJob();
});

db.on("error", function(err) {
  console.error("MongoDB connection error:", err);
});

db.on("disconnected", function() {
  console.error("MongoDB disconnected!");
});

var app = express();

// CORS configuration - uses environment variable or defaults to localhost for development
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
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

app.get("/", (req, res) => {
    res.send("Hello, World!");
});

module.exports = app;

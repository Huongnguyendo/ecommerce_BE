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

// Connection state: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
let isConnected = false;

// Function to ensure MongoDB connection (for serverless environments)
async function connectDB() {
  if (isConnected) {
    return;
  }

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { 
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Increased timeout for serverless
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    });
    
    isConnected = true;
    console.log("MongoDB database connection established successfully!");
    
    // Start the daily discount cron job (will run immediately if no deals exist)
    // Only start cron in non-serverless environments (Vercel doesn't support persistent processes)
    if (process.env.VERCEL !== '1') {
      await cronService.startDailyDiscountJob();
    }
  } catch (err) {
    console.error("MongoDB connection error:", err);
    isConnected = false;
    throw err;
  }
}

// Initialize connection
connectDB().catch(err => console.error("Failed to connect to MongoDB:", err));

const db = mongoose.connection;

db.on("error", function(err) {
  console.error("MongoDB connection error:", err);
  isConnected = false;
});

db.on("disconnected", function() {
  console.error("MongoDB disconnected!");
  isConnected = false;
});

db.on("reconnected", function() {
  console.log("MongoDB reconnected!");
  isConnected = true;
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

// Middleware to ensure DB connection before handling API requests (critical for serverless)
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ 
      success: false, 
      data: { error: 'Database connection failed' },
      message: 'Internal server error'
    });
  }
});

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

// Export both app and connectDB for serverless environments
module.exports = app;
module.exports.connectDB = connectDB;

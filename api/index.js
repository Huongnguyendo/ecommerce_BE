// Vercel serverless function entry point
// The DB connection middleware is already added in app.js before routes
const app = require('../app');

module.exports = app;

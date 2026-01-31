// Vercel Serverless Function Entry Point
const app = require('../src/server');

// Export the Express app as a Vercel serverless function
module.exports = app;
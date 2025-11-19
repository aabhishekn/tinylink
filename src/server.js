// src/server.js
const express = require("express");
const dotenv = require("dotenv");

// Load environment variables from .env file (if present)
dotenv.config();

const app = express();

// Use PORT from env or default to 3000
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies (we'll need this later for /api/links)
app.use(express.json());

// Healthcheck route
app.get("/healthz", (req, res) => {
  res.status(200).json({
    ok: true,
    version: "1.0",
    message: "TinyLink server is healthy",
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`TinyLink server is running on http://localhost:${PORT}`);
});

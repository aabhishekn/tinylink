// src/server.js
const express = require("express");
const dotenv = require("dotenv");
const db = require("./db");
const { isValidUrl, isValidCode, generateRandomCode } = require("./utils");


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

// DB healthcheck route
app.get("/db-health", async (req, res) => {
  try {
    // Simple test query
    const result = await db.query("SELECT NOW() as now");
    res.status(200).json({
      ok: true,
      now: result.rows[0].now,
      message: "Database connection is working",
    });
  } catch (error) {
    console.error("DB healthcheck failed:", error);
    res.status(500).json({
      ok: false,
      error: "Database connection failed",
    });
  }
});

// Create a new short link
app.post("/api/links", async (req, res) => {
  try {
    const { targetUrl, code: customCode } = req.body;

    // 1) Validate targetUrl
    if (!isValidUrl(targetUrl)) {
      return res.status(400).json({
        error: "Invalid URL. Please provide a valid http:// or https:// URL.",
      });
    }

    // 2) Decide the final code: use custom or generate one
    let finalCode = customCode;

    if (finalCode) {
      // Validate custom code format
      if (!isValidCode(finalCode)) {
        return res.status(400).json({
          error:
            "Invalid code. It must be 6–8 characters long and contain only letters and numbers.",
        });
      }
    } else {
      // No custom code provided → generate one
      finalCode = generateRandomCode(6);
    }

    // 3) Insert into database
    const insertQuery = `
      INSERT INTO links (code, target_url)
      VALUES ($1, $2)
      RETURNING id, code, target_url, total_clicks, last_clicked_at, created_at, updated_at;
    `;

    let result;
    try {
      result = await db.query(insertQuery, [finalCode, targetUrl]);
    } catch (err) {
      // Unique violation (duplicate code)
      if (err.code === "23505") {
        // 23505 is Postgres error code for unique constraint violation
        return res.status(409).json({
          error: "Short code already exists. Please choose another one.",
        });
      }

      console.error("Error inserting link:", err);
      return res.status(500).json({
        error: "Failed to create short link.",
      });
    }

    const link = result.rows[0];

    // 4) Return created link
    return res.status(201).json({
      id: link.id,
      code: link.code,
      targetUrl: link.target_url,
      totalClicks: link.total_clicks,
      lastClickedAt: link.last_clicked_at,
      createdAt: link.created_at,
      updatedAt: link.updated_at,
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/links:", error);
    return res.status(500).json({
      error: "Unexpected server error.",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`TinyLink server is running on http://localhost:${PORT}`);
});

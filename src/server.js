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

// Get all links
app.get("/api/links", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, code, target_url, total_clicks, last_clicked_at, created_at, updated_at
       FROM links
       ORDER BY created_at DESC`
    );

    const links = result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      targetUrl: row.target_url,
      totalClicks: row.total_clicks,
      lastClickedAt: row.last_clicked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.status(200).json(links);
  } catch (err) {
    console.error("Error fetching links:", err);
    return res.status(500).json({ error: "Failed to fetch links." });
  }
});

// Get stats for a single link by shortcode
app.get("/api/links/:code", async (req, res) => {
  const { code } = req.params;

  try {
    const result = await db.query(
      `SELECT id, code, target_url, total_clicks, last_clicked_at, created_at, updated_at
       FROM links
       WHERE code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Short link not found." });
    }

    const row = result.rows[0];

    return res.status(200).json({
      id: row.id,
      code: row.code,
      targetUrl: row.target_url,
      totalClicks: row.total_clicks,
      lastClickedAt: row.last_clicked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error("Error fetching link stats:", err);
    return res.status(500).json({ error: "Failed to fetch link stats." });
  }
});

// Delete a link by shortcode
app.delete("/api/links/:code", async (req, res) => {
  const { code } = req.params;

  try {
    // Delete the record
    const result = await db.query(
      `DELETE FROM links
       WHERE code = $1
       RETURNING id`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Short link not found." });
    }

    return res.status(200).json({ ok: true, message: "Link deleted." });
  } catch (err) {
    console.error("Error deleting link:", err);
    return res.status(500).json({ error: "Failed to delete link." });
  }
});

// Redirect route: must be near the bottom so it doesn't catch /api, /healthz, etc.
app.get("/:code", async (req, res) => {
  const { code } = req.params;

  // Optional: ignore browser's automatic /favicon.ico request
  if (code === "favicon.ico") {
    return res.status(404).end();
  }

  try {
    // Update click count and last_clicked_at, and get target URL in one query
    const result = await db.query(
      `UPDATE links
       SET total_clicks = total_clicks + 1,
           last_clicked_at = NOW(),
           updated_at = NOW()
       WHERE code = $1
       RETURNING target_url`,
      [code]
    );

    if (result.rows.length === 0) {
      // No such code
      return res.status(404).json({ error: "Short link not found." });
    }

    const targetUrl = result.rows[0].target_url;

    // 302 redirect to the original URL
    return res.redirect(302, targetUrl);
  } catch (err) {
    console.error("Error in redirect route:", err);
    return res.status(500).json({ error: "Failed to redirect." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`TinyLink server is running on http://localhost:${PORT}`);
});

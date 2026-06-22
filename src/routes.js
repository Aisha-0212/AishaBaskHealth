const express = require("express");
const { nanoid } = require("nanoid");
const pool = require("./db");
const router = express.Router();
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ─────────────────────────────────────────
// POST /shorten
// Body: { "longUrl": "https://google.com" }
// Returns: the short URL
// ─────────────────────────────────────────
router.post("/shorten", async (req, res) => {
  // 1. Get the long URL from the request body
  const { longUrl } = req.body;

  // 2. Validate input
  if (!longUrl) return res.status(400).json({ error: "longUrl is required" });

  try {
    // 3. Validate URL format
    new URL(longUrl);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    // 4. Generate a new random 7-character short code
    const shortCode = nanoid(7);

    // 5. Save to database
    await pool.query("insert into urls (short_code, long_url) values (?, ?)", [
      shortCode,
      longUrl,
    ]);

    // 6. Return result
    return res.status(201).json({
      shortCode,
      shortUrl: `${BASE_URL}/${shortCode}`,
      longUrl,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

// ─────────────────────────────────────────
// GET /:shortCode
// Redirects to the original long URL
// Also records the click
// ─────────────────────────────────────────
router.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;

  try {
    // 1. Look up short code in database
    const [rows] = await pool.query(
      "select id, long_url from urls where short_code = ? limit 1",
      [shortCode],
    );

    // 2. If not found, return 404
    if (rows.length === 0) {
      return res.status(404).json({ error: "Short URL not found" });
    }
    const { id, long_url } = rows[0];

    // 3. Increment click count
    await pool.query(
      "update urls set click_count = click_count + 1 where id = ?",
      [id],
    );

    // 4. Store click in analytics table
    await pool.query(
      "insert into url_clicks (url_id, ip_address) values (?, ?)",
      [id, req.ip],
    );

    // 5. Redirect to original URL
    return res.redirect(302, long_url);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

// ─────────────────────────────────────────
// GET /analytics/:shortCode
// Returns click count and recent clicks
// ─────────────────────────────────────────
router.get("/analytics/:shortCode", async (req, res) => {
  const { shortCode } = req.params;
  try {
    // 1. Get URL record from database
    const [rows] = await pool.query(
      "select id, long_url, click_count, created_at from urls where short_code = ? limit 1",
      [shortCode],
    );

    // 2. If not found, return 404
    if (rows.length === 0) {
      return res.status(404).json({ error: "Short URL not found" });
    }
    const url = rows[0];

    // 3. Get recent clicks
    const [clicks] = await pool.query(
      "select clicked_at, ip_address from url_clicks where url_id = ? order by clicked_at desc limit 10",
      [url.id],
    );

    // 4. Return analytics data
    return res.status(200).json({
      shortCode,
      longUrl: url.long_url,
      clickCount: url.click_count,
      createdAt: url.created_at,
      recentClicks: clicks,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;

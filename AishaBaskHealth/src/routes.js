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

  // 2. Validate the Url
  if (!longUrl) return res.status(400).json({ error: "longUrl is required" });
  try {
    new URL(longUrl);
  } catch {
    return res.status(400).json({ error: "longUrl must be valid" });
  }

  try {
    // 3. If this long URL was already shortened, no duplicates
    const [existing] = await pool.query(
      "select short_code from urls where long_url = ? limit 1",
      [longUrl],
    );

    if (existing.length > 0) {
      const code = existing[0].short_code;
      return res.status(200).json({
        shortCode: code,
        shortUrl: `${BASE_URL}/${code}`,
        longUrl,
      });
    }

    // 4. Generate a new random 7-character short code
    const shortCode = nanoid(7);

    // 5. Save it to the database
    await pool.query("INSERT INTO urls (short_code, long_url) VALUES (?, ?)", [
      shortCode,
      longUrl,
    ]);

    // 6. Return the result
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
// ─────────────────────────────────────────
router.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;

  try {
    // 1. The short code in the DB
    const [rows] = await pool.query(
      "select id, long_url from urls where short_code = ? limit 1",
      [shortCode],
    );

    // 2. If not found, return 404
    if (rows.length === 0)
      return res.status(404).json({ error: "Short URL not found" });
    const { id, long_url } = rows[0];

    // 3. Increment the click counter on the urls table
    await pool.query(
      "update urls set click_count = click_count + 1 where id = ?",
      [id],
    );

    // 4. Insert a row into url_clicks for analytics
    await pool.query(
      "insert into url_clicks (url_id, ip_address) values (?,?)",
      [id, req.ip],
    );

    // 5. Redirect the user to the original URL
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
    // 1. Get the URL record
    const [rows] = await pool.query(
      "select id, long_url, click_count, created_at from urls where short_code = ? limit 1",
      [shortCode],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Short URL not found" });
    }
    const url = rows[0];

    // 2. Get the 10 most recent clicks
    const [clicks] = await pool.query(
      "select clicked_at, ip_address from url_clicks where url_id = ? order by clicked_at desc limit 10",
      [url.id],
    );

    // 3. Return everything
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

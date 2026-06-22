require("dotenv").config();

// The duration of one window
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
// Requests number allowed per window
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10;
// store the request counts in memory as a key-value pair
const requestLog = new Map();

// Delete expired entries every WINDOW_MS milliseconds
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestLog.entries()) {
    if (now - data.windowStart > WINDOW_MS) requestLog.delete(ip);
  }
}, WINDOW_MS);

// Represent a middleware that is being run before every request
function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const data = requestLog.get(ip);

  // If this IP has no record yet, or their window expired, start fresh
  if (!data || now - data.windowStart >= WINDOW_MS) {
    requestLog.set(ip, { count: 1, windowStart: now });
    return next();
  }

  // If this IP has a record, increment their count
  data.count++;

  // If they've exceeded the limit, block them
  if (data.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too Many Requests",
      message: `You can only make ${MAX_REQUESTS} requests per minute.`,
    });
  }

  // If still within limit, allow the request
  next();
}

module.exports = rateLimiter;

const rateLimit = require("express-rate-limit");

// Removes keys that start with "$" or contain "." from anything a visitor sends, so a request
// like { "username": { "$ne": "" } } can never turn into a database operator (NoSQL injection).
const clean = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > 10) return;
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) delete value[key];
    else clean(value[key], depth + 1);
  }
};

const sanitizeRequest = (req, res, next) => {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};

const tooMany = { message: "Too many requests. Please wait a few minutes and try again." };

// Every /api call: generous for normal use, stops scripted floods.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false, message: tooMany });

// Login only: stops password guessing from one address (on top of the per-username lock in authRoutes).
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false, message: tooMany });

module.exports = { sanitizeRequest, apiLimiter, loginLimiter };

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { sendError } = require("../utils/errors");
const { publicUser } = require("../utils/userDto");
const { loginLimiter } = require("../middleware/security");

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

// --- Brute-force protection -------------------------------------------------------------
// After MAX_FAILS wrong passwords for the same username from the same address, further
// attempts are refused for WINDOW_MS. In memory is enough for a single-server college app.
const MAX_FAILS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map(); // key -> { count, first }

const keyFor = (req, id) => `${req.ip}|${id}`;
const lockedFor = (key) => {
  const a = attempts.get(key);
  if (!a) return 0;
  if (Date.now() - a.first > WINDOW_MS) { attempts.delete(key); return 0; }
  return a.count >= MAX_FAILS ? Math.ceil((WINDOW_MS - (Date.now() - a.first)) / 60000) : 0;
};
const recordFail = (key) => {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else a.count += 1;
};

// A throwaway hash so "unknown username" takes as long as "wrong password" (no username probing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

// POST /api/auth/login   body: { username, password }   (`email` still accepted for old clients)
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const identifier = String(req.body.username ?? req.body.email ?? "").trim().toLowerCase().slice(0, 80);
    const password = String(req.body.password ?? "").slice(0, 200);
    if (!identifier || !password) {
      return res.status(400).json({ message: "Please enter your username and password" });
    }

    const key = keyFor(req, identifier);
    const wait = lockedFor(key);
    if (wait) {
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${wait} minute${wait > 1 ? "s" : ""}.` });
    }

    const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
    const ok = user ? await user.comparePassword(password) : (await bcrypt.compare(password, DUMMY_HASH), false);
    if (!ok) {
      recordFail(key);
      return res.status(401).json({ message: "Incorrect username or password" });
    }
    if (user.active === false) {
      return res.status(403).json({ message: "This account has been disabled. Please contact the administrator." });
    }

    attempts.delete(key);
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    sendError(err, res);
  }
});

// GET /api/auth/me  -- the app calls this on load so changes the admin made to an account
// (new name, department...) show up without the person having to log out and in again.
router.get("/me", protect, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;

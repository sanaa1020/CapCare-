const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const wrap = require("../middleware/asyncHandler");
const { JWT_SECRET, requireAuth } = require("../middleware/auth");

const router = express.Router();

function toProfile(u) {
  return {
    username: u.username,
    name: u.name || u.username,
    age: u.age || "",
    weight: u.weight || "",
    height: u.height || "",
    allergens: JSON.parse(u.allergens || "[]"),
    tutSeen: JSON.parse(u.tut_seen || "{}"),
    tutorialDone: !!u.tutorial_done,
  };
}

function sign(user) {
  return jwt.sign({ uid: user.id, username: user.username }, JWT_SECRET, { expiresIn: "180d" });
}

// POST /api/auth/signup { username, password, name? }
// Rejects duplicate usernames with 409 + { error: "Username taken" } (matches frontend contract)
router.post("/signup", wrap(async (req, res) => {
  const { username, password, name } = req.body || {};
  if (!username || String(username).trim().length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const uname = String(username).trim();

  const existing = await db.get("SELECT id FROM users WHERE username = ?", [uname]);
  if (existing) return res.status(409).json({ error: "Username taken" });

  const hash = bcrypt.hashSync(String(password), 10);
  const info = await db.run(
    "INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)",
    [uname, hash, (name && String(name).trim()) || uname]
  );

  const user = await db.get("SELECT * FROM users WHERE id = ?", [info.lastInsertRowid]);
  res.status(201).json({ token: sign(user), profile: toProfile(user) });
}));

// POST /api/auth/login { username, password }
router.post("/login", wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  const user = await db.get("SELECT * FROM users WHERE username = ?", [String(username).trim()]);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  res.json({ token: sign(user), profile: toProfile(user) });
}));

// GET /api/auth/me: bootstrap the logged-in profile
router.get("/me", requireAuth, wrap(async (req, res) => {
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ profile: toProfile(user) });
}));

module.exports = router;

const express = require("express");
const db = require("../db");
const wrap = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

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

// GET /api/profile
router.get("/", wrap(async (req, res) => {
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ profile: toProfile(user) });
}));

// PUT /api/profile { name?, age?, weight?, height?, allergens? }
router.put("/", wrap(async (req, res) => {
  const { name, age, weight, height, allergens } = req.body || {};
  const current = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);
  if (!current) return res.status(404).json({ error: "User not found" });

  await db.run(
    `UPDATE users SET name = ?, age = ?, weight = ?, height = ?, allergens = ? WHERE id = ?`,
    [
    name !== undefined ? String(name) : current.name,
    age !== undefined ? String(age) : current.age,
    weight !== undefined ? String(weight) : current.weight,
    height !== undefined ? String(height) : current.height,
    allergens !== undefined ? JSON.stringify(allergens) : current.allergens,
    req.userId,
    ]
  );

  const updated = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);
  res.json({ profile: toProfile(updated) });
}));

// POST /api/profile/tutorial-seen { context, done? }
router.post("/tutorial-seen", wrap(async (req, res) => {
  const { context, done } = req.body || {};
  const current = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);
  if (!current) return res.status(404).json({ error: "User not found" });

  const tutSeen = JSON.parse(current.tut_seen || "{}");
  if (context) tutSeen[context] = true;

  await db.run("UPDATE users SET tut_seen = ?, tutorial_done = ? WHERE id = ?", [
    JSON.stringify(tutSeen),
    done ? 1 : current.tutorial_done,
    req.userId,
  ]);
  res.json({ ok: true });
}));

module.exports = router;

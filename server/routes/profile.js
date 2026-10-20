const express = require("express");
const db = require("../db");
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
router.get("/", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ profile: toProfile(user) });
});

// PUT /api/profile { name?, age?, weight?, height?, allergens? }
router.put("/", (req, res) => {
  const { name, age, weight, height, allergens } = req.body || {};
  const current = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!current) return res.status(404).json({ error: "User not found" });

  db.prepare(
    `UPDATE users SET name = ?, age = ?, weight = ?, height = ?, allergens = ? WHERE id = ?`
  ).run(
    name !== undefined ? String(name) : current.name,
    age !== undefined ? String(age) : current.age,
    weight !== undefined ? String(weight) : current.weight,
    height !== undefined ? String(height) : current.height,
    allergens !== undefined ? JSON.stringify(allergens) : current.allergens,
    req.userId
  );

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ profile: toProfile(updated) });
});

// POST /api/profile/tutorial-seen { context, done? }
router.post("/tutorial-seen", (req, res) => {
  const { context, done } = req.body || {};
  const current = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!current) return res.status(404).json({ error: "User not found" });

  const tutSeen = JSON.parse(current.tut_seen || "{}");
  if (context) tutSeen[context] = true;

  db.prepare("UPDATE users SET tut_seen = ?, tutorial_done = ? WHERE id = ?").run(
    JSON.stringify(tutSeen),
    done ? 1 : current.tutorial_done,
    req.userId
  );
  res.json({ ok: true });
});

module.exports = router;

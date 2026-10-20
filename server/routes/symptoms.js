const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function row(r) {
  return { id: r.id, label: r.label, cat: r.category, date: r.log_date, time: r.log_time };
}

// GET /api/symptoms: most recent 60 entries
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM symptom_logs WHERE user_id = ? ORDER BY id DESC LIMIT 60")
    .all(req.userId);
  res.json({ entries: rows.map(row) });
});

// POST /api/symptoms { label, cat, date, time }
router.post("/", (req, res) => {
  const { label, cat, date, time } = req.body || {};
  if (!label || !cat || !date || !time) return res.status(400).json({ error: "Missing fields" });

  const info = db
    .prepare("INSERT INTO symptom_logs (user_id, label, category, log_date, log_time) VALUES (?, ?, ?, ?, ?)")
    .run(req.userId, String(label), String(cat), String(date), String(time));

  // Keep only the newest 60 per user
  db.prepare(
    `DELETE FROM symptom_logs WHERE user_id = ? AND id NOT IN
     (SELECT id FROM symptom_logs WHERE user_id = ? ORDER BY id DESC LIMIT 60)`
  ).run(req.userId, req.userId);

  const created = db.prepare("SELECT * FROM symptom_logs WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ entry: row(created) });
});

// GET /api/symptoms/streak: current consecutive-day streak, based on the
// distinct calendar days the user has at least one symptom_logs row for.
router.get("/streak", (req, res) => {
  const rows = db
    .prepare("SELECT DISTINCT log_date FROM symptom_logs WHERE user_id = ?")
    .all(req.userId);

  const daySet = new Set(
    rows
      .map(r => {
        const d = new Date(r.log_date); // log_date is e.g. "Sep 8"; Date fills in the current year
        return isNaN(d.getTime()) ? null : d.toDateString();
      })
      .filter(Boolean)
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Grace period: if today has no entry yet, start counting from yesterday so
  // the streak doesn't drop to 0 the instant a new day begins before the user
  // has had a chance to log anything. It only truly resets once a full day
  // gets skipped entirely.
  if (!daySet.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  res.json({ streak });
});

// DELETE /api/symptoms/:id
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM symptom_logs WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
  res.json({ ok: true });
});

module.exports = router;

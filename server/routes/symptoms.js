const express = require("express");
const db = require("../db");
const wrap = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function row(r) {
  return { id: r.id, label: r.label, cat: r.category, date: r.log_date, time: r.log_time };
}

// GET /api/symptoms: most recent 60 entries
router.get("/", wrap(async (req, res) => {
  const rows = await db.all("SELECT * FROM symptom_logs WHERE user_id = ? ORDER BY id DESC LIMIT 60", [req.userId]);
  res.json({ entries: rows.map(row) });
}));

// POST /api/symptoms { label, cat, date, time }
router.post("/", wrap(async (req, res) => {
  const { label, cat, date, time } = req.body || {};
  if (!label || !cat || !date || !time) return res.status(400).json({ error: "Missing fields" });

  const info = await db.run(
    "INSERT INTO symptom_logs (user_id, label, category, log_date, log_time) VALUES (?, ?, ?, ?, ?)",
    [req.userId, String(label), String(cat), String(date), String(time)]
  );

  // Keep only the newest 60 per user
  await db.run(
    `DELETE FROM symptom_logs WHERE user_id = ? AND id NOT IN
     (SELECT id FROM symptom_logs WHERE user_id = ? ORDER BY id DESC LIMIT 60)`,
    [req.userId, req.userId]
  );

  const created = await db.get("SELECT * FROM symptom_logs WHERE id = ?", [info.lastInsertRowid]);
  res.status(201).json({ entry: row(created) });
}));

// GET /api/symptoms/streak: current consecutive-day streak, based on the
// distinct calendar days the user has at least one symptom_logs row for.
router.get("/streak", wrap(async (req, res) => {
  const rows = await db.all("SELECT DISTINCT log_date FROM symptom_logs WHERE user_id = ?", [req.userId]);

  const daySet = new Set(
    rows
      .map(r => {
        // log_date is e.g. "Sep 8" with no year. new Date("Sep 8") defaults to 2001 in V8,
        // so add the current year explicitly (and roll back a year if that lands in the future,
        // e.g. a "Dec 30" entry read on Jan 2).
        const now = new Date();
        let d = new Date(`${r.log_date} ${now.getFullYear()}`);
        if (!isNaN(d.getTime()) && d > now) d = new Date(`${r.log_date} ${now.getFullYear() - 1}`);
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
}));

// DELETE /api/symptoms/:id
router.delete("/:id", wrap(async (req, res) => {
  await db.run("DELETE FROM symptom_logs WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  res.json({ ok: true });
}));

module.exports = router;

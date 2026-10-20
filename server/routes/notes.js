const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function row(r) {
  return { id: r.id, text: r.body, ts: r.display_ts };
}

// GET /api/notes
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC").all(req.userId);
  res.json({ entries: rows.map(row) });
});

// POST /api/notes { text, ts }
router.post("/", (req, res) => {
  const { text, ts } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: "Note text required" });

  const displayTs =
    ts ||
    new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const info = db
    .prepare("INSERT INTO notes (user_id, body, display_ts) VALUES (?, ?, ?)")
    .run(req.userId, String(text).trim(), displayTs);

  const created = db.prepare("SELECT * FROM notes WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ entry: row(created) });
});

// DELETE /api/notes/:id
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
  res.json({ ok: true });
});

module.exports = router;

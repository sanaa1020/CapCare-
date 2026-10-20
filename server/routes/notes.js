const express = require("express");
const db = require("../db");
const wrap = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function row(r) {
  return { id: r.id, text: r.body, ts: r.display_ts };
}

// GET /api/notes
router.get("/", wrap(async (req, res) => {
  const rows = await db.all("SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC", [req.userId]);
  res.json({ entries: rows.map(row) });
}));

// POST /api/notes { text, ts }
router.post("/", wrap(async (req, res) => {
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

  const info = await db.run("INSERT INTO notes (user_id, body, display_ts) VALUES (?, ?, ?)", [
    req.userId,
    String(text).trim(),
    displayTs,
  ]);

  const created = await db.get("SELECT * FROM notes WHERE id = ?", [info.lastInsertRowid]);
  res.status(201).json({ entry: row(created) });
}));

// DELETE /api/notes/:id
router.delete("/:id", wrap(async (req, res) => {
  await db.run("DELETE FROM notes WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  res.json({ ok: true });
}));

module.exports = router;

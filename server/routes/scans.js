// Allergy label/ingredient scan history (the OCR / mock-ingredient scanner in AllergyScreen).
// Kept separate from the real barcode+Open Food Facts history in routes/barcode.js.
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function row(r) {
  return {
    id: r.id,
    product: r.product,
    flagCount: r.flag_count,
    ingredients: JSON.parse(r.ingredients || "[]"),
    date: r.log_date,
    time: r.log_time,
  };
}

// GET /api/scans: most recent 30
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM allergy_scans WHERE user_id = ? ORDER BY id DESC LIMIT 30")
    .all(req.userId);
  res.json({ entries: rows.map(row) });
});

// POST /api/scans { product, flagCount, ingredients, date, time }
router.post("/", (req, res) => {
  const { product, flagCount, ingredients, date, time } = req.body || {};
  if (!product || !date || !time) return res.status(400).json({ error: "Missing fields" });

  const info = db
    .prepare(
      "INSERT INTO allergy_scans (user_id, product, flag_count, ingredients, log_date, log_time) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(req.userId, String(product), Number(flagCount) || 0, JSON.stringify(ingredients || []), String(date), String(time));

  db.prepare(
    `DELETE FROM allergy_scans WHERE user_id = ? AND id NOT IN
     (SELECT id FROM allergy_scans WHERE user_id = ? ORDER BY id DESC LIMIT 30)`
  ).run(req.userId, req.userId);

  const created = db.prepare("SELECT * FROM allergy_scans WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ entry: row(created) });
});

module.exports = router;

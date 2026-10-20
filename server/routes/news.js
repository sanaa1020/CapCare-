// Health news system: three separate feeds, each its own trust tier.
//   GET /api/news         general health/allergy news, ranked by relevance
//                          to the requesting user's saved allergens.
//   GET /api/news/recalls official openFDA food recalls (structured
//                          government data, not press coverage).
//   GET /api/news/alerts  CDC outbreak/health-alert headlines.
// All three are fetched through services/newsSources.js, persisted in
// SQLite via services/newsCache.js (survives restarts, avoids hammering the
// external APIs on every request), and news/recalls are tagged against the
// requesting user's allergens via services/relevance.js.
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { getFreshOrFetch } = require("../services/newsCache");
const { fetchRankedNews, fetchFoodRecalls, fetchCdcAlerts } = require("../services/newsSources");
const { scoreArticleForAllergens } = require("../services/relevance");

const router = express.Router();
router.use(requireAuth);

function getUserAllergens(userId) {
  const user = db.prepare("SELECT allergens FROM users WHERE id = ?").get(userId);
  return JSON.parse(user?.allergens || "[]").filter(a => a !== "none");
}

// GET /api/news
router.get("/", async (req, res) => {
  try {
    const articles = await getFreshOrFetch("news", fetchRankedNews);
    const allergens = getUserAllergens(req.userId);

    const scored = articles.map(a => {
      const { score, matched } = scoreArticleForAllergens(a, allergens);
      return { ...a, tags: matched, _score: score };
    });
    scored.sort((a, b) => b._score - a._score || new Date(b.pubDate) - new Date(a.pubDate));

    res.json({ articles: scored.slice(0, 12).map(({ _score, ...a }) => a) });
  } catch (err) {
    console.error("News fetch failed:", err.message);
    res.status(502).json({ error: "Couldn't load news right now" });
  }
});

// GET /api/news/recalls
router.get("/recalls", async (req, res) => {
  try {
    const recalls = await getFreshOrFetch("recall", fetchFoodRecalls);
    const allergens = getUserAllergens(req.userId);
    const tagged = recalls.map(r => ({ ...r, tags: scoreArticleForAllergens(r, allergens).matched }));
    res.json({ recalls: tagged.slice(0, 10) });
  } catch (err) {
    console.error("Recalls fetch failed:", err.message);
    res.status(502).json({ error: "Couldn't load recalls right now" });
  }
});

// GET /api/news/alerts
router.get("/alerts", async (req, res) => {
  try {
    const alerts = await getFreshOrFetch("alert", fetchCdcAlerts);
    res.json({ alerts: alerts.slice(0, 8) });
  } catch (err) {
    console.error("Alerts fetch failed:", err.message);
    res.status(502).json({ error: "Couldn't load alerts right now" });
  }
});

module.exports = router;

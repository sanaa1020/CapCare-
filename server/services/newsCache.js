// DB-backed cache for the news/recalls/alerts feeds (see news_articles +
// news_fetch_log in db.js). Articles are stored in SQLite instead of only
// held in memory, so a server restart doesn't throw away a perfectly fresh
// fetch, and every request doesn't have to hit the external API. This also
// sets up the data model for future features like saved articles or a
// personalized digest email, since the articles already live in the DB.
const db = require("../db");

const TTL_MS = {
  news: 10 * 60 * 1000,       // 10 minutes
  recall: 6 * 60 * 60 * 1000, // 6 hours: openFDA is only updated weekly anyway
  alert: 30 * 60 * 1000,      // 30 minutes
};

function cacheAgeMs(sourceType) {
  const row = db.prepare("SELECT fetched_at FROM news_fetch_log WHERE source_type = ?").get(sourceType);
  if (!row) return Infinity;
  return Date.now() - new Date(row.fetched_at + "Z").getTime();
}

function readCached(sourceType) {
  const rows = db
    .prepare("SELECT * FROM news_articles WHERE source_type = ? ORDER BY pub_date DESC")
    .all(sourceType);
  return rows.map(r => ({
    id: r.id,
    source: r.source_name,
    title: r.title,
    summary: r.summary,
    link: r.link,
    pubDate: r.pub_date,
    ...JSON.parse(r.extra || "{}"),
  }));
}

function writeCache(sourceType, articles) {
  const del = db.prepare("DELETE FROM news_articles WHERE source_type = ?");
  const insert = db.prepare(`
    INSERT INTO news_articles (id, source_type, source_name, title, link, summary, pub_date, extra, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      source_type = excluded.source_type, source_name = excluded.source_name,
      title = excluded.title, link = excluded.link, summary = excluded.summary,
      pub_date = excluded.pub_date, extra = excluded.extra, fetched_at = excluded.fetched_at
  `);
  const touch = db.prepare(`
    INSERT INTO news_fetch_log (source_type, fetched_at) VALUES (?, datetime('now'))
    ON CONFLICT(source_type) DO UPDATE SET fetched_at = excluded.fetched_at
  `);

  del.run(sourceType);
  for (const a of articles) {
    const { id, source, title, summary, link, pubDate, ...extra } = a;
    insert.run(id, sourceType, source || "", title, link, summary || "", pubDate || "", JSON.stringify(extra));
  }
  touch.run(sourceType);
}

// Returns cached articles if still fresh; otherwise calls fetchFn(), stores
// whatever it returns, and falls back to serving stale cache (rather than an
// empty list) if the fetch fails or comes back empty.
async function getFreshOrFetch(sourceType, fetchFn) {
  if (cacheAgeMs(sourceType) < TTL_MS[sourceType]) {
    const cached = readCached(sourceType);
    if (cached.length) return cached;
  }
  try {
    const fresh = await fetchFn();
    if (fresh.length) {
      writeCache(sourceType, fresh);
      return fresh;
    }
  } catch (err) {
    console.error(`[news:${sourceType}] fetch failed, serving cache:`, err.message);
  }
  return readCached(sourceType);
}

module.exports = { getFreshOrFetch };

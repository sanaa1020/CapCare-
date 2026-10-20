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

async function cacheAgeMs(sourceType) {
  const row = await db.get("SELECT fetched_at FROM news_fetch_log WHERE source_type = ?", [sourceType]);
  if (!row) return Infinity;
  return Date.now() - new Date(row.fetched_at + "Z").getTime();
}

async function readCached(sourceType) {
  const rows = await db.all("SELECT * FROM news_articles WHERE source_type = ? ORDER BY pub_date DESC", [sourceType]);
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

async function writeCache(sourceType, articles) {
  const insertSql = `
    INSERT INTO news_articles (id, source_type, source_name, title, link, summary, pub_date, extra, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      source_type = excluded.source_type, source_name = excluded.source_name,
      title = excluded.title, link = excluded.link, summary = excluded.summary,
      pub_date = excluded.pub_date, extra = excluded.extra, fetched_at = excluded.fetched_at
  `;
  const touchSql = `
    INSERT INTO news_fetch_log (source_type, fetched_at) VALUES (?, datetime('now'))
    ON CONFLICT(source_type) DO UPDATE SET fetched_at = excluded.fetched_at
  `;

  // One atomic round trip to Turso instead of N+2 separate requests.
  const statements = [{ sql: "DELETE FROM news_articles WHERE source_type = ?", args: [sourceType] }];
  for (const a of articles) {
    const { id, source, title, summary, link, pubDate, ...extra } = a;
    statements.push({
      sql: insertSql,
      args: [id, sourceType, source || "", title, link, summary || "", pubDate || "", JSON.stringify(extra)],
    });
  }
  statements.push({ sql: touchSql, args: [sourceType] });
  await db.batch(statements);
}

// Returns cached articles if still fresh; otherwise calls fetchFn(), stores
// whatever it returns, and falls back to serving stale cache (rather than an
// empty list) if the fetch fails or comes back empty.
async function getFreshOrFetch(sourceType, fetchFn) {
  if ((await cacheAgeMs(sourceType)) < TTL_MS[sourceType]) {
    const cached = await readCached(sourceType);
    if (cached.length) return cached;
  }
  try {
    const fresh = await fetchFn();
    if (fresh.length) {
      await writeCache(sourceType, fresh);
      return fresh;
    }
  } catch (err) {
    console.error(`[news:${sourceType}] fetch failed, serving cache:`, err.message);
  }
  return readCached(sourceType);
}

module.exports = { getFreshOrFetch };

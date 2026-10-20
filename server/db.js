// db.js: database access via libSQL (Turso).
//
// Production / Vercel: set TURSO_DATABASE_URL (libsql://<db>-<org>.turso.io) and
// TURSO_AUTH_TOKEN (a *database* token, `turso db tokens create <db>`).
// Local dev: if TURSO_DATABASE_URL is unset, falls back to a local SQLite file at
// server/data/capcare.db, so `npm start` keeps working with zero setup.
//
// The libSQL client is async (the old node:sqlite one was synchronous), so every
// helper below returns a Promise. Tables are created lazily via init(), which is
// awaited by a middleware in index.js before any request is handled.
const path = require("path");
const fs = require("fs");
const { createClient } = require("@libsql/client");

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  url = "file:" + path.join(dataDir, "capcare.db");
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    age           TEXT,
    weight        TEXT,
    height        TEXT,
    allergens     TEXT DEFAULT '[]',
    tut_seen      TEXT DEFAULT '{}',
    tutorial_done INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS symptom_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,
    category    TEXT NOT NULL,
    log_date    TEXT NOT NULL,
    log_time    TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    display_ts  TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS allergy_scans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product     TEXT NOT NULL,
    flag_count  INTEGER DEFAULT 0,
    ingredients TEXT DEFAULT '[]',
    log_date    TEXT NOT NULL,
    log_time    TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- Open Food Facts cache: one row per barcode, refreshed periodically
  CREATE TABLE IF NOT EXISTS products (
    barcode     TEXT PRIMARY KEY,
    data        TEXT NOT NULL,
    fetched_at  TEXT DEFAULT (datetime('now'))
  );

  -- Per-user scanned-food history (barcode scanner). One row per user+barcode;
  -- rescanning the same product updates it in place instead of duplicating.
  CREATE TABLE IF NOT EXISTS scanned_foods (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barcode       TEXT NOT NULL,
    product_name  TEXT,
    brand         TEXT,
    quantity      TEXT,
    image_url     TEXT,
    nutriscore    TEXT,
    scanned_at    TEXT DEFAULT (datetime('now')),
    product_data  TEXT,
    UNIQUE(user_id, barcode)
  );

  -- News/recalls/alerts cache (see server/services/newsSources.js +
  -- newsCache.js). Fetched articles are stored here instead of only in
  -- memory, so the cache survives server restarts and can later back
  -- features like saved articles or a personalized digest email.
  CREATE TABLE IF NOT EXISTS news_articles (
    id           TEXT PRIMARY KEY,
    source_type  TEXT NOT NULL,
    source_name  TEXT,
    title        TEXT NOT NULL,
    link         TEXT NOT NULL,
    summary      TEXT,
    pub_date     TEXT,
    extra        TEXT DEFAULT '{}',
    fetched_at   TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_news_articles_source_type ON news_articles(source_type);

  -- Last successful fetch time per source_type, so freshness survives a
  -- server restart instead of resetting to "never fetched" every boot.
  CREATE TABLE IF NOT EXISTS news_fetch_log (
    source_type  TEXT PRIMARY KEY,
    fetched_at   TEXT NOT NULL
  );
`;

let ready;
function init() {
  if (!ready) {
    ready = client.executeMultiple(SCHEMA).catch((err) => {
      ready = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return ready;
}

// Plain-object rows so JSON.parse / property access behave like before.
const toObj = (row) => (row ? { ...row } : undefined);

async function all(sql, args = []) {
  const r = await client.execute({ sql, args });
  return r.rows.map(toObj);
}

async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0];
}

// Returns { changes, lastInsertRowid } like node:sqlite's run().
async function run(sql, args = []) {
  const r = await client.execute({ sql, args });
  return {
    changes: r.rowsAffected,
    lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined,
  };
}

// Run several statements atomically: batch([{ sql, args }, ...]).
function batch(statements) {
  return client.batch(statements, "write");
}

module.exports = { client, init, all, get, run, batch };

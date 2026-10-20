// db.js: SQLite initialization. Creates all tables on first run.
//
// Uses Node's built-in `node:sqlite` (DatabaseSync) rather than better-sqlite3:
// this sandbox's network policy blocks the prebuilt-binary/node-gyp downloads
// better-sqlite3 needs to compile its native addon, while node:sqlite ships
// inside the Node binary itself (stable/experimental since Node 22) and needs
// no native build step at all. The API (prepare/run/get/all) is effectively
// the same, so nothing above this module needs to change.
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "capcare.db");
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
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
`);

module.exports = db;

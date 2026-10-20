// Raw fetchers for every external feed the news system draws from. Each
// function returns a plain array of { id, source, title, summary, link,
// pubDate } objects, normalized to the same shape regardless of where they
// came from, so the caching layer (services/newsCache.js) and scoring layer
// (services/relevance.js) don't need to know which source produced them.
//
// Verified working endpoints (checked directly before wiring these up):
//   - openFDA food enforcement: https://api.fda.gov/food/enforcement.json (no key, live data confirmed)
//   - CDC Online Newsroom RSS:  https://tools.cdc.gov/api/v2/resources/media/132608.rss (no key, live data confirmed)
//   - GNews search:             https://gnews.io/api/v4/search (needs GNEWS_API_KEY; see fetchGNews below)
// WHO's Disease Outbreak News page no longer exposes a working public RSS
// feed (it's now a JS-driven filter page), so it isn't wired in here; CDC's
// Newsroom feed already regularly covers food-outbreak alerts (E. coli,
// Salmonella, Listeria, etc.) so it fills the same "authoritative alert" role.

function decodeEntities(str) {
  return String(str)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}
function stripTags(str) {
  return decodeEntities(str).replace(/<[^>]*>/g, "").trim();
}

// Node's fetch has no default timeout, so a stalled connection would hang a
// request indefinitely instead of failing fast into the cache/fallback path.
async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseRssItems(xml, defaultSource, max = 15) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) && items.length < max) {
    const block = m[1];
    const title = stripTags((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
    const link = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "");
    const pubDate = decodeEntities((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "");
    const description = stripTags((block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "");
    const rawSource = stripTags((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || "");
    if (title && link) {
      items.push({ id: link, title, summary: description, link, pubDate, source: rawSource || defaultSource });
    }
  }
  return items;
}

// --- General health/allergy news --------------------------------------------

// Preferred raw source when GNEWS_API_KEY is set (see server/.env.example).
// Free tier: 100 requests/day, no localhost restriction (unlike NewsAPI.org's
// free plan). Docs: https://docs.gnews.io/endpoints/search-endpoint
async function fetchGNews() {
  const key = process.env.GNEWS_API_KEY;
  if (!key) {
    const e = new Error("GNEWS_API_KEY not set");
    e.code = "NO_KEY";
    throw e;
  }
  const query = encodeURIComponent("food allergy OR allergen OR nutrition OR anaphylaxis");
  const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&max=15&apikey=${key}`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) {
    const e = new Error(`GNews responded with ${resp.status} ${resp.statusText}`);
    e.code = "NEWS_ERROR";
    throw e;
  }
  const json = await resp.json();
  return (json.articles || []).map(a => ({
    id: a.url,
    title: a.title,
    summary: a.description || "",
    link: a.url,
    pubDate: a.publishedAt || "",
    source: a.source?.name || "GNews",
  }));
}

// Fallback #1 when there's no GNews key (or GNews fails): NPR's Health RSS.
async function fetchNprHealth() {
  const resp = await fetchWithTimeout("https://feeds.npr.org/1128/rss.xml");
  if (!resp.ok) {
    const e = new Error(`NPR feed responded with ${resp.status} ${resp.statusText}`);
    throw e;
  }
  return parseRssItems(await resp.text(), "NPR");
}

// Fallback #2: Google News RSS search, used only if both of the above fail.
async function fetchGoogleNewsFallback() {
  const query = encodeURIComponent("food allergy OR nutrition OR allergy health");
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) {
    const e = new Error(`Google News responded with ${resp.status} ${resp.statusText}`);
    throw e;
  }
  return parseRssItems(await resp.text(), "Google News");
}

function describeFetchError(err) {
  if (err.name === "AbortError") return "request timed out";
  if (err.cause) return `${err.message} (${err.cause.code || err.cause.message || err.cause})`;
  return err.message;
}

// Tries GNews first (if a key is configured), then falls through the two
// keyless RSS sources. Whichever one first returns actual articles wins.
async function fetchRankedNews() {
  const attempts = [
    ["GNews", fetchGNews],
    ["NPR", fetchNprHealth],
    ["Google News", fetchGoogleNewsFallback],
  ];
  let lastErr = null;
  for (const [name, fn] of attempts) {
    try {
      const items = await fn();
      if (items.length) return items;
      console.error(`${name} returned zero parseable items, trying next source`);
    } catch (err) {
      if (err.code !== "NO_KEY") console.error(`${name} news fetch failed:`, describeFetchError(err));
      lastErr = err;
    }
  }
  throw lastErr || new Error("All news sources failed");
}

// --- Official food recalls (openFDA) ----------------------------------------

// Structured, government-sourced recall data: a different trust tier from
// press coverage, so it's kept as its own endpoint/section rather than mixed
// into the general news list. No API key required for this call volume.
async function fetchFoodRecalls() {
  const url = "https://api.fda.gov/food/enforcement.json?limit=20&sort=report_date:desc";
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) {
    const e = new Error(`openFDA responded with ${resp.status} ${resp.statusText}`);
    throw e;
  }
  const json = await resp.json();
  return (json.results || []).map(r => {
    const firm = r.recalling_firm || "Unknown firm";
    const product = (r.product_description || "").split(".")[0].slice(0, 140);
    const dateStr = r.report_date && r.report_date.length === 8
      ? `${r.report_date.slice(0, 4)}-${r.report_date.slice(4, 6)}-${r.report_date.slice(6, 8)}`
      : "";
    return {
      id: r.recall_number || `${firm}-${r.report_date}`,
      title: `${firm}: ${product}`,
      summary: r.reason_for_recall || "",
      link: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
      pubDate: dateStr,
      source: "openFDA",
      classification: r.classification || "",
      status: r.status || "",
    };
  });
}

// --- Health/outbreak alerts (CDC) -------------------------------------------

async function fetchCdcAlerts() {
  const resp = await fetchWithTimeout("https://tools.cdc.gov/api/v2/resources/media/132608.rss");
  if (!resp.ok) {
    const e = new Error(`CDC feed responded with ${resp.status} ${resp.statusText}`);
    throw e;
  }
  return parseRssItems(await resp.text(), "CDC", 12);
}

module.exports = { fetchRankedNews, fetchFoodRecalls, fetchCdcAlerts };

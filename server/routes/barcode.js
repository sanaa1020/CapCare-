// Barcode scanner backend. Implements the Open Food Facts v3 integration
// requested in barcode_scannner_prompt.txt:
//   * looks up a scanned barcode against Open Food Facts API v3
//   * applies the exact fallback chains specified (name / description / ingredients / nutrition)
//   * never invents data: missing fields become explicit "N/A" / "... not available" strings
//   * caches product lookups in SQLite so the same barcode isn't re-fetched on every scan
//   * saves scan history per user, updating (not duplicating) rows for repeat scans
//
// The original spec assumed a Python + Flet app; this project's real frontend is
// React/Vite, so the same behaviour is implemented here in Node/Express instead.
// The OFF field list, fallback rules, product schema, caching, and history/dedupe
// logic are carried over exactly.
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { keywordsFor } = require("../services/allergenKeywords");

const router = express.Router();

const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "generic_name",
  "generic_name_en",
  "abbreviated_product_name",
  "brands",
  "quantity",
  "serving_size",
  "categories",
  "labels",
  "ingredients_text",
  "ingredients_text_en",
  "ingredients",
  "allergens",
  "traces",
  "nutriscore_grade",
  "nutriments",
  "image_front_url",
  "lang",
  "categories_tags",
].join(",");

// Fields requested from the OFF *search* endpoint when looking for alternatives:
// a smaller set than the single-product lookup above, since we only need enough
// to rank/display candidates, not the full nutrition breakdown.
const ALT_SEARCH_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "brands",
  "categories",
  "allergens",
  "traces",
  "ingredients_text",
  "ingredients_text_en",
  "image_front_url",
  "nutriscore_grade",
].join(",");

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h, avoid hammering OFF for the same barcode

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

// Recursively pull ingredient text out of OFF's structured `ingredients` array.
function extractStructuredIngredients(ingredients) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return undefined;
  const parts = [];
  const walk = (list) => {
    for (const ing of list) {
      if (ing && typeof ing === "object") {
        if (ing.text) parts.push(String(ing.text));
        else if (ing.id) parts.push(String(ing.id).replace(/^en:/, "").replace(/-/g, " "));
        if (Array.isArray(ing.ingredients)) walk(ing.ingredients);
      }
    }
  };
  walk(ingredients);
  return parts.length ? parts.join(", ") : undefined;
}

function nutrient(nutriments, key) {
  if (!nutriments || nutriments[key] === undefined || nutriments[key] === null || nutriments[key] === "") {
    return "N/A";
  }
  return nutriments[key];
}

// Normalize a raw Open Food Facts v3 payload into the clean product shape the UI expects.
function normalizeProduct(barcode, p) {
  const name = firstNonEmpty(p.product_name, p.product_name_en) || "Unknown product";
  const description =
    firstNonEmpty(p.generic_name, p.generic_name_en, p.abbreviated_product_name) ||
    "Description not available";
  const ingredients =
    firstNonEmpty(p.ingredients_text, p.ingredients_text_en) ||
    extractStructuredIngredients(p.ingredients) ||
    "Ingredients not available in Open Food Facts";
  const nutriments = p.nutriments || {};

  return {
    barcode,
    name,
    brand: firstNonEmpty(p.brands) || "N/A",
    quantity: firstNonEmpty(p.quantity) || "N/A",
    serving_size: firstNonEmpty(p.serving_size) || "N/A",
    description,
    ingredients,
    allergens: firstNonEmpty(p.allergens) || "",
    traces: firstNonEmpty(p.traces) || "",
    categories: firstNonEmpty(p.categories) || "N/A",
    labels: firstNonEmpty(p.labels) || "N/A",
    image_url: firstNonEmpty(p.image_front_url) || null,
    categories_tags: Array.isArray(p.categories_tags) ? p.categories_tags : [],
    energy: nutrient(nutriments, "energy-kcal_100g"),
    fat: nutrient(nutriments, "fat_100g"),
    saturated_fat: nutrient(nutriments, "saturated-fat_100g"),
    carbohydrates: nutrient(nutriments, "carbohydrates_100g"),
    sugars: nutrient(nutriments, "sugars_100g"),
    protein: nutrient(nutriments, "proteins_100g"),
    fiber: nutrient(nutriments, "fiber_100g"),
    salt: nutrient(nutriments, "salt_100g"),
    nutriscore: (p.nutriscore_grade || "unknown").toUpperCase(),
  };
}

// Cross-check a product against a user's saved allergens for a quick warning
// flag. The app's own allergen ids (peanuts, treenuts, dairy, ...) don't
// literally appear in Open Food Facts data, which uses its own taxonomy tags
// (en:milk, en:nuts, ...) and free-text ingredient words (hazelnuts, cheese,
// ...), so each id is matched against a small set of real-world synonyms
// instead of a literal substring match on the id itself.
function matchAllergens(product, allergenIds) {
  const haystack = `${product.allergens} ${product.traces} ${product.ingredients} ${product.categories}`.toLowerCase();
  return allergenIds.filter((raw) => keywordsFor(raw).some((kw) => haystack.includes(kw)));
}

async function fetchFromOpenFoodFacts(barcode) {
  const url = `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`;
  let resp;
  try {
    resp = await fetch(url, { headers: { "User-Agent": "CapCarePlus/1.0 (health app barcode scanner)" } });
  } catch (err) {
    const e = new Error("Could not reach Open Food Facts, check your internet connection");
    e.code = "NETWORK";
    throw e;
  }
  if (!resp.ok) {
    const e = new Error(`Open Food Facts responded with ${resp.status}`);
    e.code = "OFF_ERROR";
    throw e;
  }
  const json = await resp.json();
  // v3: status 0 / "product_not_found" means no such barcode in the database
  if (json.status === 0 || json.result?.id === "product_not_found" || !json.product) {
    const e = new Error("Product not found in Open Food Facts");
    e.code = "NOT_FOUND";
    throw e;
  }
  return normalizeProduct(barcode, json.product);
}

// Search Open Food Facts for other products in a given category (legacy
// search.pl, the long-stable, widely-documented OFF search endpoint) and
// normalize each hit into the same product shape used everywhere else.
async function searchOpenFoodFacts(categoryTag) {
  // action=process is required. Without it search.pl just renders the
  // search *form* instead of actually executing the tag filter, which was
  // silently returning zero products for every category.
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?json=1&action=process&page_size=40` +
    `&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(categoryTag)}` +
    `&fields=${ALT_SEARCH_FIELDS}`;
  let resp;
  try {
    resp = await fetch(url, { headers: { "User-Agent": "CapCarePlus/1.0 (health app barcode scanner)" } });
  } catch (err) {
    console.error(`Alternatives search failed (network) for tag "${categoryTag}":`, err.message);
    return [];
  }
  if (!resp.ok) {
    console.error(`Alternatives search failed (HTTP ${resp.status}) for tag "${categoryTag}"`);
    return [];
  }
  let json;
  try {
    json = await resp.json();
  } catch (err) {
    console.error(`Alternatives search returned non-JSON for tag "${categoryTag}":`, err.message);
    return [];
  }
  const products = Array.isArray(json.products) ? json.products : [];
  console.log(`Alternatives search for tag "${categoryTag}": ${products.length} raw hits`);
  return products
    .filter((p) => p && p.code)
    .map((p) => normalizeProduct(String(p.code), p));
}

// Not every OFF product carries categories_tags (the structured taxonomy).
// When it's missing, fall back to a tag guessed from the free-text
// `categories` field so a category search still has something to work with.
function deriveCategoryTag(product) {
  const cats = String(product.categories || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!cats.length) return null;
  return "en:" + cats[cats.length - 1].toLowerCase().replace(/\s+/g, "-");
}

// Find safer alternatives to a product the user just scanned: other products
// in the same category that don't contain any of the allergens that flagged
// the original. Tries the most specific category tag first, falling back to
// broader ones until enough safe candidates turn up.
async function findAlternatives(product, matchedAllergenIds, excludeBarcode) {
  const realTags = product.categories_tags || [];
  const tags = realTags.length ? [...realTags].reverse() : [deriveCategoryTag(product)].filter(Boolean);
  const nutriscoreRank = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  let candidates = [];

  console.log(`Finding alternatives for barcode ${excludeBarcode}, allergens=[${matchedAllergenIds.join(",")}], tags to try=[${tags.join(", ")}]`);

  for (const tag of tags) {
    const found = await searchOpenFoodFacts(tag);
    candidates = found.filter(
      (p) =>
        String(p.barcode) !== String(excludeBarcode) &&
        p.name !== "Unknown product" &&
        matchAllergens(p, matchedAllergenIds).length === 0
    );
    console.log(`  tag "${tag}": ${found.length} hits, ${candidates.length} safe candidates after filtering`);
    if (candidates.length >= 3) break;
  }

  candidates.sort((a, b) => (nutriscoreRank[a.nutriscore] ?? 5) - (nutriscoreRank[b.nutriscore] ?? 5));

  return candidates.slice(0, 5).map((p) => ({
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    image_url: p.image_url,
    nutriscore: p.nutriscore,
  }));
}

// GET /api/barcode/:code: look up (cached) product info, optionally recording a scan
router.get("/:code", requireAuth, async (req, res) => {
  const barcode = String(req.params.code || "").trim();
  if (!/^[0-9]{6,14}$/.test(barcode)) {
    return res.status(400).json({ error: "Invalid barcode format" });
  }

  try {
    const cached = await db.get("SELECT * FROM products WHERE barcode = ?", [barcode]);
    let product;

    if (cached && Date.now() - new Date(cached.fetched_at + "Z").getTime() < CACHE_TTL_MS) {
      product = JSON.parse(cached.data);
    } else {
      try {
        product = await fetchFromOpenFoodFacts(barcode);
        await db.run(
          `INSERT INTO products (barcode, data, fetched_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(barcode) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`,
          [barcode, JSON.stringify(product)]
        );
      } catch (err) {
        if (cached) {
          // Serve stale cache rather than fail outright if OFF is unreachable
          product = JSON.parse(cached.data);
        } else if (err.code === "NOT_FOUND") {
          return res.status(404).json({ error: "Product not found in Open Food Facts", code: "NOT_FOUND" });
        } else {
          return res.status(502).json({ error: err.message, code: err.code || "OFF_ERROR" });
        }
      }
    }

    // Record/refresh this user's scan history (one row per user+barcode, no duplicate spam)
    await db.run(
      `INSERT INTO scanned_foods (user_id, barcode, product_name, brand, quantity, image_url, nutriscore, scanned_at, product_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
       ON CONFLICT(user_id, barcode) DO UPDATE SET
         product_name = excluded.product_name,
         brand        = excluded.brand,
         quantity     = excluded.quantity,
         image_url    = excluded.image_url,
         nutriscore   = excluded.nutriscore,
         scanned_at   = excluded.scanned_at,
         product_data = excluded.product_data`,
      [
        req.userId,
        barcode,
        product.name ?? null,
        product.brand ?? null,
        product.quantity ?? null,
        product.image_url ?? null,
        product.nutriscore ?? null,
        JSON.stringify(product),
      ]
    );

    // Cross-check against the user's known allergens for a quick warning flag.
    const user = await db.get("SELECT allergens FROM users WHERE id = ?", [req.userId]);
    const userAllergens = JSON.parse(user?.allergens || "[]").filter((a) => a !== "none");
    const matched = matchAllergens(product, userAllergens);

    res.json({ product, matchedAllergens: matched });
  } catch (err) {
    console.error("Barcode lookup failed:", err);
    res.status(500).json({ error: "Unexpected server error while looking up barcode" });
  }
});

// GET /api/barcode/:code/alternatives: safer alternatives to a product the
// user already scanned (must have been looked up via GET /:code first, so
// it's sitting in the products cache). Only meaningful when that product
// actually matched one of the user's allergens; otherwise returns an empty list.
router.get("/:code/alternatives", requireAuth, async (req, res) => {
  const barcode = String(req.params.code || "").trim();
  if (!/^[0-9]{6,14}$/.test(barcode)) {
    return res.status(400).json({ error: "Invalid barcode format" });
  }

  try {
    const cached = await db.get("SELECT * FROM products WHERE barcode = ?", [barcode]);
    if (!cached) {
      return res.status(404).json({ error: "Scan this product first" });
    }
    let product = JSON.parse(cached.data);

    // Rows cached before categories_tags was added to the schema (or simply
    // fetched at a time OFF omitted it) won't have it. Refetch once from OFF
    // so alternatives aren't silently starved by stale cache data. This also
    // heals the cache in place for next time.
    if (!(product.categories_tags || []).length) {
      try {
        const fresh = await fetchFromOpenFoodFacts(barcode);
        await db.run(`UPDATE products SET data = ?, fetched_at = datetime('now') WHERE barcode = ?`, [
          JSON.stringify(fresh),
          barcode,
        ]);
        product = fresh;
      } catch {
        /* OFF unreachable or product gone, fall back to deriveCategoryTag below */
      }
    }

    const user = await db.get("SELECT allergens FROM users WHERE id = ?", [req.userId]);
    const userAllergens = JSON.parse(user?.allergens || "[]").filter((a) => a !== "none");
    const matched = matchAllergens(product, userAllergens);

    if (matched.length === 0) {
      return res.json({ alternatives: [] });
    }

    const alternatives = await findAlternatives(product, matched, barcode);
    res.json({ alternatives });
  } catch (err) {
    console.error("Alternatives lookup failed:", err);
    res.status(500).json({ error: "Unexpected server error while finding alternatives" });
  }
});

// GET /api/barcode/history/list: this user's scanned-food history
router.get("/history/list", requireAuth, async (req, res) => {
  let rows;
  try {
    rows = await db.all("SELECT * FROM scanned_foods WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 50", [req.userId]);
  } catch (err) {
    console.error("History lookup failed:", err);
    return res.status(500).json({ error: "Couldn't load scan history" });
  }
  res.json({
    entries: rows.map((r) => ({
      id: r.id,
      barcode: r.barcode,
      productName: r.product_name,
      brand: r.brand,
      quantity: r.quantity,
      imageUrl: r.image_url,
      nutriscore: r.nutriscore,
      scannedAt: r.scanned_at,
      product: JSON.parse(r.product_data || "{}"),
    })),
  });
});

module.exports = router;

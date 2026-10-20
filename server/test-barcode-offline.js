// Offline self-test for the barcode/Open Food Facts integration.
// This sandbox's network is allowlisted and can't reach world.openfoodfacts.org,
// so this script stubs global.fetch with a realistic (deliberately incomplete)
// OFF v3 payload to prove the fallback chains, nutrition parsing, caching, and
// allergen cross-check behave correctly end to end. Not part of the app itself,
// safe to delete once you've verified the server on a machine with real internet
// access. Run with: node test-barcode-offline.js
const path = require("path");
const fs = require("fs");

// Use a throwaway local database file so this never touches real data (or Turso).
const TEST_DB = path.join(__dirname, "data", "test-offline.db");
fs.mkdirSync(path.dirname(TEST_DB), { recursive: true });
for (const f of [TEST_DB, TEST_DB + "-wal", TEST_DB + "-shm"]) if (fs.existsSync(f)) fs.unlinkSync(f);
process.env.TURSO_DATABASE_URL = "file:" + TEST_DB;
delete process.env.TURSO_AUTH_TOKEN;

// Stub a realistic (partial) Open Food Facts v3 response BEFORE requiring the router,
// so the intentionally-missing fields (generic_name_en, ingredients_text) exercise the
// fallback chains described in barcode_scannner_prompt.txt.
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  // Only intercept calls to Open Food Facts; everything else (including this
  // script's own calls to the local test server below) goes through for real.
  if (typeof url !== "string" || !url.includes("openfoodfacts.org")) {
    return realFetch(url, opts);
  }
  console.log("[stub fetch] ->", url);
  return {
    ok: true,
    json: async () => ({
      status: 1,
      product: {
        code: "3017620422003",
        product_name: "Nutella",
        brands: "Ferrero",
        quantity: "400 g",
        // generic_name deliberately absent -> should fall back to abbreviated_product_name
        abbreviated_product_name: "Hazelnut spread",
        categories: "Spreads, Sweet spreads",
        labels: "",
        // ingredients_text deliberately absent -> should fall back to structured `ingredients`
        ingredients: [
          { id: "en:sugar", text: "Sugar" },
          { id: "en:palm-oil", text: "Palm oil" },
          { id: "en:hazelnuts", text: "Hazelnuts (13%)" },
        ],
        allergens: "en:nuts,en:milk",
        traces: "en:soybeans",
        nutriscore_grade: "e",
        nutriments: {
          "energy-kcal_100g": 539,
          fat_100g: 30.9,
          "saturated-fat_100g": 10.6,
          carbohydrates_100g: 57.5,
          sugars_100g: 56.3,
          proteins_100g: 6.3,
          // fiber deliberately absent -> should render "N/A"
          salt_100g: 0.107,
        },
        image_front_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front.jpg",
        lang: "en",
      },
    }),
  };
};

const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./db");
const { JWT_SECRET } = require("./middleware/auth");
const barcodeRoutes = require("./routes/barcode");

const app = express();
app.use(express.json());
app.use("/api/barcode", barcodeRoutes);

(async () => {
// Create a throwaway test user with a known allergen list, so the allergen
// cross-check has something real to match against.
await db.init();
await db.run(
  "INSERT INTO users (username, password_hash, name, allergens) VALUES (?, 'x', 'Offline Test', ?)",
  ["offline_test_user", JSON.stringify(["treenuts", "dairy"])]
);
const user = await db.get("SELECT * FROM users WHERE username = ?", ["offline_test_user"]);
const token = jwt.sign({ uid: user.id, username: user.username }, JWT_SECRET);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = `http://localhost:${port}/api/barcode`;

  const checks = [];
  const assert = (label, cond) => {
    checks.push({ label, pass: !!cond });
    console.log(`${cond ? "PASS" : "FAIL"}: ${label}`);
  };

  const resp1 = await fetch(`${base}/3017620422003`, { headers: { Authorization: `Bearer ${token}` } });
  const body1 = await resp1.json();
  console.log("\nFirst lookup (hits stubbed OFF, should cache):\n", JSON.stringify(body1, null, 2));

  const p = body1.product;
  assert("HTTP 200", resp1.status === 200);
  assert("name resolved from product_name", p.name === "Nutella");
  assert("description fell back to abbreviated_product_name", p.description === "Hazelnut spread");
  assert(
    "ingredients fell back to structured `ingredients` array",
    p.ingredients === "Sugar, Palm oil, Hazelnuts (13%)"
  );
  assert("missing fiber renders as N/A", p.fiber === "N/A");
  assert("energy parsed from nutriments", p.energy === 539);
  assert("nutriscore uppercased", p.nutriscore === "E");
  assert("image_url passed through", !!p.image_url);
  assert(
    "allergen cross-check matched the user's saved treenuts/dairy against allergens+traces+ingredients",
    body1.matchedAllergens.length > 0
  );

  // Second lookup should hit the DB cache, not the stub fetch again.
  let offFetchCalls = 0;
  const wrappedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (typeof url === "string" && url.includes("openfoodfacts.org")) offFetchCalls++;
    return wrappedFetch(url, opts);
  };
  const resp2 = await fetch(`${base}/3017620422003`, { headers: { Authorization: `Bearer ${token}` } });
  await resp2.json();
  assert("second lookup served from cache (no extra OFF call)", offFetchCalls === 0);

  const histResp = await fetch(`${base}/history/list`, { headers: { Authorization: `Bearer ${token}` } });
  const hist = await histResp.json();
  assert("scan history recorded exactly one row (upsert, no duplicate)", hist.entries.length === 1);
  assert("history row has the resolved product name", hist.entries[0].productName === "Nutella");

  const badResp = await fetch(`${base}/not-a-barcode`, { headers: { Authorization: `Bearer ${token}` } });
  assert("invalid barcode format rejected with 400", badResp.status === 400);

  const failed = checks.filter(c => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
  server.close(() => process.exit(failed.length ? 1 : 0));
});
})();

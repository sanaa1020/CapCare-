// Shared allergen -> keyword map. The app's own allergen ids (peanuts,
// treenuts, dairy, ...) don't literally appear in most external text (OFF
// ingredient data, news headlines, FDA recall descriptions), so each id is
// matched against a small set of real-world synonyms instead of a literal
// substring match on the id itself. Used by both the barcode/OFF matching
// (routes/barcode.js) and the news relevance scoring (services/relevance.js)
// so the two stay in sync instead of drifting apart as separate copies.
const ALLERGEN_KEYWORDS = {
  peanuts: ["peanut"],
  treenuts: ["nut", "almond", "cashew", "walnut", "hazelnut", "pistachio", "pecan", "macadamia"],
  dairy: ["milk", "dairy", "lactose", "cheese", "butter", "cream", "yogurt", "yoghurt"],
  eggs: ["egg"],
  soy: ["soy", "soya", "soybean"],
  gluten: ["gluten", "wheat", "barley", "rye"],
  fish: ["fish"],
  shellfish: ["shellfish", "crustacean", "shrimp", "prawn", "crab", "lobster"],
  sesame: ["sesame"],
  mustard: ["mustard"],
};

// A user's saved allergen id may come prefixed as "other:<id>" for custom
// entries; strips that and falls back to keyword-izing the id itself when
// it isn't one of the known ids above.
function keywordsFor(rawAllergenId) {
  const id = rawAllergenId.replace(/^other:/, "");
  return ALLERGEN_KEYWORDS[id] || [id.replace(/_/g, " ")];
}

module.exports = { ALLERGEN_KEYWORDS, keywordsFor };

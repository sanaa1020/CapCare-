// Scores a news/recall item against a user's saved allergens, so the general
// news feed can be ranked by actual relevance to that person instead of just
// chronological order. A title match counts for more than a summary-only
// match, since it means the allergen is the subject of the piece rather than
// an incidental mention.
const { keywordsFor } = require("./allergenKeywords");

function scoreArticleForAllergens(article, allergenIds) {
  if (!allergenIds || !allergenIds.length) return { score: 0, matched: [] };

  const title = (article.title || "").toLowerCase();
  const summary = (article.summary || "").toLowerCase();
  let score = 0;
  const matched = [];

  for (const raw of allergenIds) {
    const keywords = keywordsFor(raw);
    const inTitle = keywords.some(kw => title.includes(kw));
    const inSummary = !inTitle && keywords.some(kw => summary.includes(kw));
    if (inTitle) { score += 3; matched.push(raw.replace(/^other:/, "")); }
    else if (inSummary) { score += 1; matched.push(raw.replace(/^other:/, "")); }
  }

  return { score, matched };
}

module.exports = { scoreArticleForAllergens };

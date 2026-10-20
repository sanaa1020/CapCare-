const jwt = require("jsonwebtoken");
// A hardcoded fallback is fine for local dev only. In production (Vercel sets
// NODE_ENV=production) refuse to start rather than sign sessions with a
// publicly-known secret on an app that stores health data.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production");
}
const JWT_SECRET = process.env.JWT_SECRET || "capcare-dev-secret-change-me";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.uid;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth, JWT_SECRET };

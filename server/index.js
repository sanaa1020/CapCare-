const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

// Loads server/.env (e.g. GNEWS_API_KEY) if present; harmless no-op if it
// doesn't exist yet. Requires Node 20.6+ (this project targets 22.5+).
try { process.loadEnvFile(path.join(__dirname, ".env")); } catch { /* no .env yet, that's fine */ }

require("./db"); // ensure tables exist before anything else touches them

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const symptomRoutes = require("./routes/symptoms");
const noteRoutes = require("./routes/notes");
const scanRoutes = require("./routes/scans");
const barcodeRoutes = require("./routes/barcode");
const newsRoutes = require("./routes/news");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "capcare-server" }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/barcode", barcodeRoutes);
app.use("/api/news", newsRoutes);

// Serve the built React app (client/dist) so one server = frontend + backend together.
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res
      .status(200)
      .send(
        "CapCare+ API is running, but the client hasn't been built yet.\n" +
          "Run `npm run build` from the project root, then restart the server."
      );
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CapCare+ server listening on http://0.0.0.0:${PORT}`);
});

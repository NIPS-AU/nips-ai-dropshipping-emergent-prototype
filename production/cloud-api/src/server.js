import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";

import { licenseMiddleware } from "./middleware/license.js";
import { router as discovery } from "./routes/discovery.js";
import { router as imports } from "./routes/imports.js";
import { router as ai } from "./routes/ai.js";
import { router as publish } from "./routes/publish.js";
import { router as cloud } from "./routes/cloud.js";
import { router as releases } from "./routes/releases.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));

// ── CORS ────────────────────────────────────────────────────────────────────
const DEFAULT_ORIGINS = [
  "https://dropshipping.nips.live",
  "https://alloutspares.com",
  "https://api.nipsdownloads.com",
  "https://updates.nipsdownloads.com",
];
const envOrigins = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = envOrigins.length > 0 ? envOrigins : DEFAULT_ORIGINS;
const EMERGENT_REGEX = /^https:\/\/.*\.preview\.emergentagent\.com$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);              // curl, server-to-server
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      if (EMERGENT_REGEX.test(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", process.env.LICENSE_HEADER || "X-NIPS-License-Key"],
  })
);

// ── Public health ───────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ service: "nips-ai-dropshipping-cloud", status: "ok", version: process.env.npm_package_version || "1.0.0" }));
app.get("/healthz", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── License middleware (skips public paths) ─────────────────────────────────
app.use(licenseMiddleware);

// ── Routers ────────────────────────────────────────────────────────────────
app.use(discovery);
app.use(imports);
app.use(ai);
app.use(publish);
app.use(cloud);
app.use(releases);

// ── 404 + error ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "not_found", path: req.path }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error", detail: err.message });
});

const port = Number(process.env.PORT) || 4100;
app.listen(port, () => {
  console.log(`▶ NIPS-AI Cloud API listening on :${port}`);
  console.log(`  Public URL : ${process.env.PUBLIC_API_URL || "(not set)"}`);
  console.log(`  Origins    : ${ALLOWED_ORIGINS.join(", ") || "(none)"} + ${EMERGENT_REGEX}`);
});

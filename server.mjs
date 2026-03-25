/**
 * Mo's Auto Trading — Main Server Entry Point
 *
 * Sets up Express, mounts all route modules, and starts the server.
 * Business logic lives in routes/ and services/ — not here.
 */

import "dotenv/config";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import path from "path";
import fs from "fs";

// ── ROUTES ────────────────────────────────────────────────────────────────────
import authRoutes    from "./routes/authRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import uploadRoutes  from "./routes/uploadRoutes.js";
import aiRoutes      from "./routes/aiRoutes.js";

// ── APP SETUP ─────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 10000;

// Ensure upload directories exist
["uploads", "uploads/profile", "uploads/cars"].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "mo-auto-trading-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: "mo_auto_trading",
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60   // 7 days in seconds
    }),
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
    }
  })
);

// Serve static files
app.use("/", express.static("public"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── ROUTE MODULES ─────────────────────────────────────────────────────────────
app.use(authRoutes);
app.use(listingRoutes);
app.use(messageRoutes);
app.use(vehicleRoutes);
app.use(uploadRoutes);
app.use(aiRoutes);

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[server error]", err.message);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Mo's Auto Trading running on http://localhost:${PORT}`);
});

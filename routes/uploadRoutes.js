import { Router } from "express";
import multer from "multer";
import path from "path";
import { users } from "../db.js";
import { requireLogin } from "../middleware/auth.js";

const router = Router();
const ID = "M01031166";

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const uploadLimits = { fileSize: 5 * 1024 * 1024 }; // 5 MB

const profileUpload = multer({ dest: "uploads/profile/", fileFilter: imageFilter, limits: uploadLimits });
const carUpload     = multer({ dest: "uploads/cars/",    fileFilter: imageFilter, limits: uploadLimits });

// ── PROFILE PICTURE UPLOAD ────────────────────────────────────────────────────
router.post(
  `/${ID}/upload/profile`,
  requireLogin,
  profileUpload.single("image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const url = `/uploads/profile/${req.file.filename}`;
    await users.updateOne(
      { username: req.session.username },
      { $set: { profilePic: url } }
    );
    res.json({ success: true, url });
  }
);

// ── CAR IMAGES UPLOAD ─────────────────────────────────────────────────────────
router.post(
  `/${ID}/upload/car`,
  requireLogin,
  carUpload.array("images", 3),
  (req, res) => {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    const urls = req.files.map(f => `/uploads/cars/${f.filename}`);
    res.json({ success: true, urls });
  }
);

export default router;

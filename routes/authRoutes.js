import { Router } from "express";
import bcrypt from "bcryptjs";
import { users, contents } from "../db.js";
import { requireLogin } from "../middleware/auth.js";

const router = Router();
const ID = "M01031166";

// ── CHECK LOGIN STATUS ────────────────────────────────────────────────────────
router.get(`/${ID}/login`, async (req, res) => {
  if (!req.session.username) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, username: req.session.username });
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post(`/${ID}/login`, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  const user = await users.findOne({ username });
  if (!user) return res.json({ success: false, message: "Invalid username or password" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ success: false, message: "Invalid username or password" });

  req.session.username = username;
  res.json({ success: true, message: "Login successful", username });
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
router.delete(`/${ID}/login`, (req, res) => {
  req.session.destroy(() => res.json({ success: true, message: "Logged out" }));
});

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post(`/${ID}/users`, async (req, res) => {
  const { username, email, password, location, role, dob } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "Username, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  const exists = await users.findOne({ username });
  if (exists) return res.json({ success: false, message: "Username already taken" });

  const hashedPassword = await bcrypt.hash(password, 10);

  await users.insertOne({
    username,
    email,
    password: hashedPassword,
    location: location || "",
    role: role || "",
    dob: dob || "",
    profilePic: "",
    follows: [],
    createdAt: new Date()
  });

  res.json({ success: true, message: "Account created successfully" });
});

// ── SEARCH USERS ──────────────────────────────────────────────────────────────
router.get(`/${ID}/users`, async (req, res) => {
  const q = (req.query.q || "").trim().slice(0, 50);
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const result = await users
    .find({ username: { $regex: safe, $options: "i" } })
    .project({ password: 0 })
    .limit(20)
    .toArray();
  res.json({ success: true, results: result });
});

// ── PROFILE ENDPOINTS ─────────────────────────────────────────────────────────
router.get(`/${ID}/profile/:username`, async (req, res) => {
  const user = await users.findOne(
    { username: req.params.username },
    { projection: { password: 0 } }
  );
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const followingCount = (user.follows || []).length;
  const followersCount = await users.countDocuments({ follows: req.params.username });
  const listingsCount  = await contents.countDocuments({ ownerUsername: req.params.username });

  res.json({
    success: true,
    user: {
      username: user.username,
      email: user.email,
      location: user.location || "",
      role: user.role || "",
      profilePic: user.profilePic || "",
      createdAt: user.createdAt
    },
    followersCount,
    followingCount,
    listingsCount
  });
});

router.get(`/${ID}/profile/:username/following`, async (req, res) => {
  const user = await users.findOne({ username: req.params.username });
  if (!user) return res.json({ success: false, message: "User not found" });

  const followingUsers = await users
    .find({ username: { $in: user.follows || [] } })
    .project({ password: 0 })
    .toArray();

  res.json({ success: true, users: followingUsers });
});

router.get(`/${ID}/profile/:username/followers`, async (req, res) => {
  const followers = await users
    .find({ follows: req.params.username })
    .project({ password: 0 })
    .toArray();
  res.json({ success: true, users: followers });
});

// ── FOLLOW / UNFOLLOW ─────────────────────────────────────────────────────────
router.post(`/${ID}/follow`, requireLogin, async (req, res) => {
  const { targetUsername } = req.body;
  if (!targetUsername) return res.json({ success: false, message: "Target username is required" });
  if (targetUsername === req.session.username) {
    return res.json({ success: false, message: "You cannot follow yourself" });
  }

  const target = await users.findOne({ username: targetUsername });
  if (!target) return res.json({ success: false, message: "User not found" });

  await users.updateOne(
    { username: req.session.username },
    { $addToSet: { follows: targetUsername } }
  );
  res.json({ success: true, message: `Now following ${targetUsername}` });
});

router.delete(`/${ID}/follow`, requireLogin, async (req, res) => {
  const { targetUsername } = req.body;
  if (!targetUsername) return res.json({ success: false, message: "Target username is required" });

  await users.updateOne(
    { username: req.session.username },
    { $pull: { follows: targetUsername } }
  );
  res.json({ success: true, message: `Unfollowed ${targetUsername}` });
});

export default router;

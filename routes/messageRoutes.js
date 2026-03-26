import { Router } from "express";
import { messages, users } from "../db.js";
import { requireLogin } from "../middleware/auth.js";

const router = Router();
const ID = "M01031166";

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
router.post(`/${ID}/messages`, requireLogin, async (req, res) => {
  const { to } = req.body;
  const text = req.body.text?.trim();
  if (!to || !text) {
    return res.status(400).json({ success: false, message: "to and text are required" });
  }
  if (text.length > 1000) {
    return res.status(400).json({ success: false, message: "Message must be 1000 characters or fewer" });
  }
  if (to === req.session.username) {
    return res.json({ success: false, message: "You cannot message yourself" });
  }

  const target = await users.findOne({ username: to });
  if (!target) return res.status(404).json({ success: false, message: "Recipient not found" });

  await messages.insertOne({
    from: req.session.username,
    to,
    text,
    createdAt: new Date()
  });

  res.json({ success: true, message: "Message sent" });
});

// ── GET CONVERSATION ──────────────────────────────────────────────────────────
router.get(`/${ID}/messages`, requireLogin, async (req, res) => {
  const other = req.query.with;
  if (!other) return res.status(400).json({ success: false, message: "Query param 'with' required" });

  const results = await messages
    .find({
      $or: [
        { from: req.session.username, to: other },
        { from: other, to: req.session.username }
      ]
    })
    .sort({ createdAt: 1 })
    .toArray();

  res.json({ success: true, results });
});

// ── LIST CONVERSATIONS ────────────────────────────────────────────────────────
router.get(`/${ID}/conversations`, requireLogin, async (req, res) => {
  const username = req.session.username;

  const convs = await messages
    .aggregate([
      { $match: { $or: [{ from: username }, { to: username }] } },
      {
        $project: {
          with: { $cond: [{ $eq: ["$from", username] }, "$to", "$from"] },
          text: 1,
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$with",
          lastMessage: { $first: "$text" },
          updatedAt: { $first: "$createdAt" }
        }
      },
      { $sort: { updatedAt: -1 } }
    ])
    .toArray();

  res.json({ success: true, results: convs });
});

export default router;

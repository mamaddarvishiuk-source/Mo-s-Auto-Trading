import { Router } from "express";
import { contents, users, favourites } from "../db.js";
import { requireLogin } from "../middleware/auth.js";
import { toObjectId } from "../utils/helpers.js";
import { scoreListing, getRecommendations } from "../services/aiService.js";

const router = Router();
const ID = "M01031166";

// ── CREATE LISTING ────────────────────────────────────────────────────────────
router.post(`/${ID}/contents`, requireLogin, async (req, res) => {
  const data = req.body;
  const doc = {
    ...data,
    ownerUsername: req.session.username,
    createdAt: new Date(),
    likes: data.likes || [],
    comments: data.comments || []
  };

  if (doc.year) doc.year = Number(doc.year);
  if (doc.price) doc.price = Number(doc.price);
  if (doc.mileage) doc.mileage = Number(doc.mileage);
  if (doc.engineCapacity) doc.engineCapacity = Number(doc.engineCapacity);
  if (doc.co2Emissions) doc.co2Emissions = Number(doc.co2Emissions);

  const result = await contents.insertOne(doc);
  res.json({ success: true, message: "Listing created", id: result.insertedId });
});

// ── SEARCH LISTINGS (public) ──────────────────────────────────────────────────
router.get(`/${ID}/contents`, async (req, res) => {
  const { make, model, minPrice, maxPrice, sort, fuelType, year, limit } = req.query;

  const query = {};
  if (make) query.make = { $regex: make, $options: "i" };
  if (model) query.model = { $regex: model, $options: "i" };
  if (fuelType) query.fuelType = { $regex: fuelType, $options: "i" };
  if (year) query.year = Number(year);

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const sortQuery = {};
  if (sort === "newest" || !sort) sortQuery.createdAt = -1;
  else if (sort === "oldest") sortQuery.createdAt = 1;
  else if (sort === "pricelow") sortQuery.price = 1;
  else if (sort === "pricehigh") sortQuery.price = -1;

  const cursor = contents.find(query).sort(sortQuery);
  if (limit) cursor.limit(Number(limit));

  const result = await cursor.toArray();
  res.json({ success: true, results: result });
});

// ── SINGLE LISTING DETAIL (public) ───────────────────────────────────────────
router.get(`/${ID}/listings/:id`, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid listing ID" });

  const listing = await contents.findOne({ _id: id });
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

  const owner = listing.ownerUsername
    ? await users.findOne({ username: listing.ownerUsername }, { projection: { password: 0 } })
    : null;

  res.json({ success: true, listing, owner });
});

// ── DELETE LISTING ────────────────────────────────────────────────────────────
router.delete(`/${ID}/listings/:id`, requireLogin, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid listing ID" });

  const listing = await contents.findOne({ _id: id });
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
  if (listing.ownerUsername !== req.session.username) {
    return res.status(403).json({ success: false, message: "Not authorised" });
  }

  await contents.deleteOne({ _id: id });
  res.json({ success: true, message: "Listing deleted" });
});

// ── LIKE / UNLIKE ─────────────────────────────────────────────────────────────
router.post(`/${ID}/listings/:id/like`, requireLogin, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid listing ID" });

  const listing = await contents.findOne({ _id: id });
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

  const username = req.session.username;
  const alreadyLiked = (listing.likes || []).includes(username);

  const op = alreadyLiked
    ? { $pull: { likes: username } }
    : { $addToSet: { likes: username } };

  await contents.updateOne({ _id: id }, op);
  const updated = await contents.findOne({ _id: id });

  res.json({ success: true, liked: !alreadyLiked, count: (updated.likes || []).length });
});

// ── COMMENTS ──────────────────────────────────────────────────────────────────
router.post(`/${ID}/listings/:id/comments`, requireLogin, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid listing ID" });

  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, message: "Comment text is required" });

  const listing = await contents.findOne({ _id: id });
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

  const comment = {
    username: req.session.username,
    text: text.trim(),
    createdAt: new Date()
  };

  await contents.updateOne({ _id: id }, { $push: { comments: comment } });
  res.json({ success: true, comment });
});

// ── MY LISTINGS ───────────────────────────────────────────────────────────────
router.get(`/${ID}/my-listings`, requireLogin, async (req, res) => {
  const docs = await contents
    .find({ ownerUsername: req.session.username })
    .sort({ createdAt: -1 })
    .toArray();
  res.json({ success: true, listings: docs });
});

// ── FOLLOWED-USER FEED ────────────────────────────────────────────────────────
router.get(`/${ID}/feed`, requireLogin, async (req, res) => {
  const user = await users.findOne({ username: req.session.username });
  const followsArray = user?.follows || [];

  if (!followsArray.length) return res.json({ success: true, results: [] });

  const feedContents = await contents
    .find({ ownerUsername: { $in: followsArray } })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, results: feedContents });
});

// ── FAVOURITES ────────────────────────────────────────────────────────────────
router.post(`/${ID}/favourites`, requireLogin, async (req, res) => {
  const id = toObjectId(req.body.listingId);
  if (!id) return res.status(400).json({ success: false, message: "Invalid listingId" });

  const existing = await favourites.findOne({ username: req.session.username, listingId: id });
  if (existing) return res.json({ success: true, message: "Already in favourites" });

  await favourites.insertOne({ username: req.session.username, listingId: id, createdAt: new Date() });
  res.json({ success: true, message: "Added to favourites" });
});

router.delete(`/${ID}/favourites`, requireLogin, async (req, res) => {
  const id = toObjectId(req.body.listingId);
  if (!id) return res.status(400).json({ success: false, message: "Invalid listingId" });

  await favourites.deleteOne({ username: req.session.username, listingId: id });
  res.json({ success: true, message: "Removed from favourites" });
});

router.get(`/${ID}/favourites`, requireLogin, async (req, res) => {
  const favDocs = await favourites.find({ username: req.session.username }).toArray();
  const ids = favDocs.map(f => f.listingId);
  if (!ids.length) return res.json({ success: true, results: [] });

  const listings = await contents.find({ _id: { $in: ids } }).sort({ createdAt: -1 }).toArray();
  res.json({ success: true, results: listings });
});

// ── AI INSIGHTS (enriches listing response) ───────────────────────────────────
router.get(`/${ID}/listings/:id/insights`, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid listing ID" });

  const listing = await contents.findOne({ _id: id });
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

  const [scoreResult, recommendResult] = await Promise.all([
    scoreListing(listing),
    getRecommendations({ listingId: listing._id, make: listing.make, model: listing.model, year: listing.year, priceRange: listing.price })
  ]);

  res.json({
    success: true,
    listingId: id,
    qualityScore: scoreResult.success ? scoreResult.data : null,
    recommendations: recommendResult.success ? recommendResult.data : null
  });
});

export default router;

/**
* Student Name : MOHAMMAD DARVISHI
* Student ID : M01031166
* WEB APPLICATIONS AND DATABASES
* Coursework2 : MO'S AUTO TRADING
* MODULE LEADERS: DAVID GAMEZ, ADAM PHILPOT 
*/ 

// Import all the modules the server needs: Express for routing, sessions for login,
// Multer for file uploads, Axios for API calls, and MongoDB tools for database work.
// Set up the Express app and basic constants like the port and my student ID.

import express from "express";
import session from "express-session";
import multer from "multer";
import axios from "axios";
import { MongoClient, ObjectId } from "mongodb";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
const M01031166 = "M01031166";


// ******* DVLA VEHICLE ENQUIRY (Third Party API)  *******
const DVLA_API_KEY = "V3nrsgd0bI2fOr8I9UPjXOZhUP4oxqZ1Qirjyqrf";

// ******* MONGODB SETUP *******

const mongoClient = new MongoClient(
  "mongodb+srv://mamad:mo12345@cluster0.ej9ioib.mongodb.net/?appName=Cluster0"
);
await mongoClient.connect();
const db = mongoClient.db("mo_auto_trading");

const users = db.collection("users");
const contents = db.collection("contents");
const favourites = db.collection("favourites");
const messages = db.collection("messages");

// ******* EXPRESS MIDDLEWARE *******

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "mo-secret-key",
    resave: false,
    saveUninitialized: false
  })
);

// Check if the upload folders exist before the server runs.
// If they’re missing, create them so image uploads don’t throw errors later.

["uploads", "uploads/profile", "uploads/cars"].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve the static front-end files, and also expose the uploaded images
// so the browser can load them normally from the /uploads path.

app.use("/", express.static("public"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// image uploads
const profileUpload = multer({ dest: "uploads/profile/" });
const carUpload = multer({ dest: "uploads/cars/" });

// Basic login check used for protected routes.
// If the user doesn’t have a session, block the request and return an error.

function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }
  next();
}

// Small helper that tries to turn a string into a real ObjectId.
// If it fails (bad format or invalid id), just return null instead of crashing the server.

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// ******* USER PATHS (endpoints) *******

// REGISTER NEW USER
// POST /M01031166/users

app.post(`/${M01031166}/users`, async (req, res) => {
  const { username, email, password, location, role, dob } = req.body;

  if (!username || !email || !password) {
    return res.json({
      success: false,
      message: "Username, email and password are required"
    });
  }

  const exists = await users.findOne({ username });
  if (exists) {
    return res.json({ success: false, message: "Username already exists" });
  }

  await users.insertOne({
    username,
    email,
    password, 
    location: location || "",
    role: role || "",
    dob,
    profilePic: "",
    follows: [],
    createdAt: new Date()
  });

  res.json({ success: true, message: "User registered" });
});

// SEARCH USERS
// GET /M01031166/users?q=

app.get(`/${M01031166}/users`, async (req, res) => {
  const q = req.query.q || "";
  const result = await users
    .find({ username: { $regex: q, $options: "i" } })
    .project({ password: 0 })
    .toArray();

  res.json({ success: true, results: result });
});

// ******* LOGIN PATHS *******

// CHECK LOGIN STATUS
// GET /M01031166/login

app.get(`/${M01031166}/login`, async (req, res) => {
  if (!req.session.username) {
    return res.json({ loggedIn: false });
  }

  // Return username only; detailed profile comes from /profile/:username
  res.json({
    loggedIn: true,
    username: req.session.username
  });
});

// LOGIN
// POST /M01031166/login

app.post(`/${M01031166}/login`, async (req, res) => {
  const { username, password } = req.body;

  const user = await users.findOne({ username, password });

  if (!user) {
    return res.json({ success: false, message: "Invalid login" });
  }

  req.session.username = username;

  res.json({
    success: true,
    message: "Login successful",
    username
  });
});

// LOGOUT
// DELETE /M01031166/login

app.delete(`/${M01031166}/login`, (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

// ******* CONTENT / LISTINGS *******

// CREATE LISTING
// POST /M01031166/contents

app.post(`/${M01031166}/contents`, requireLogin, async (req, res) => {
  const data = req.body;

  const doc = {
    ...data,
    ownerUsername: req.session.username,
    createdAt: new Date(),
    likes: data.likes || [],      // default empty likes array
    comments: data.comments || [] // default empty comments array
  };

  // ensure numeric fields are numbers

  if (doc.year) doc.year = Number(doc.year);
  if (doc.price) doc.price = Number(doc.price);
  if (doc.mileage) doc.mileage = Number(doc.mileage);
  if (doc.engineCapacity) doc.engineCapacity = Number(doc.engineCapacity);
  if (doc.co2Emissions) doc.co2Emissions = Number(doc.co2Emissions);

  await contents.insertOne(doc);

  res.json({ success: true, message: "Listing created" });
});

// SEARCH CONTENTS (all listings)
// GET /M01031166/contents?make=&minPrice=&maxPrice=&sort=

app.get(`/${M01031166}/contents`, async (req, res) => {
  const { make, minPrice, maxPrice, sort } = req.query;

  const query = {};
  if (make) query.make = { $regex: make, $options: "i" };

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const sortQuery = {};
  if (sort === "newest") sortQuery.createdAt = -1;
  if (sort === "oldest") sortQuery.createdAt = 1;
  if (sort === "pricelow") sortQuery.price = 1;
  if (sort === "pricehigh") sortQuery.price = -1;

  const result = await contents.find(query).sort(sortQuery).toArray();

  res.json({ success: true, results: result });
});

// SINGLE LISTING DETAILS
// GET /M01031166/listings/:id

app.get(`/${M01031166}/listings/:id`, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid listing id" });
  }

  const listing = await contents.findOne({ _id: id });
  if (!listing) {
    return res
      .status(404)
      .json({ success: false, message: "Listing not found" });
  }

  const owner = listing.ownerUsername
    ? await users.findOne(
        { username: listing.ownerUsername },
        { projection: { password: 0 } }
      )
    : null;

  res.json({ success: true, listing, owner });
});

// ******* FOLLOW / UNFOLLOW / FEED *******

// FOLLOW USER

app.post(`/${M01031166}/follow`, requireLogin, async (req, res) => {
  const { targetUsername } = req.body;

  if (!targetUsername) {
    return res.json({
      success: false,
      message: "Target username is required"
    });
  }

  if (targetUsername === req.session.username) {
    return res.json({
      success: false,
      message: "You cannot follow yourself"
    });
  }

  const targetUser = await users.findOne({ username: targetUsername });
  if (!targetUser) {
    return res.json({ success: false, message: "User not found" });
  }

  await users.updateOne(
    { username: req.session.username },
    { $addToSet: { follows: targetUsername } }
  );

  res.json({ success: true, message: "Now following user" });
});

// UNFOLLOW USER

app.delete(`/${M01031166}/follow`, requireLogin, async (req, res) => {
  const { targetUsername } = req.body;

  if (!targetUsername) {
    return res.json({
      success: false,
      message: "Target username is required"
    });
  }

  await users.updateOne(
    { username: req.session.username },
    { $pull: { follows: targetUsername } }
  );

  res.json({ success: true, message: "Unfollowed user" });
});

// FEED: ONLY CONTENT FROM FOLLOWED USERS
// GET /M01031166/feed

app.get(`/${M01031166}/feed`, requireLogin, async (req, res) => {
  const user = await users.findOne({ username: req.session.username });

  const followsArray = user?.follows || [];

  if (!followsArray.length) {
    return res.json({ success: true, results: [] });
  }

  const feedContents = await contents
    .find({ ownerUsername: { $in: followsArray } })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, results: feedContents });
});

// PROFILE SUMMARY
// GET /M01031166/profile/:username

app.get(`/${M01031166}/profile/:username`, async (req, res) => {
  const username = req.params.username;

  const user = await users.findOne(
    { username },
    { projection: { password: 0 } }
  );
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const followingCount = (user.follows || []).length;
  const followersCount = await users.countDocuments({ follows: username });
  const listingsCount = await contents.countDocuments({
    ownerUsername: username
  });

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

// GET /M01031166/profile/:username/following
// List of users that :username is following

app.get(`/${M01031166}/profile/:username/following`, async (req, res) => {
  const username = req.params.username;

  const user = await users.findOne({ username });
  if (!user) return res.json({ success: false, message: "User not found" });

  const following = user.follows || [];

  const followingUsers = await users
    .find({ username: { $in: following } })
    .project({ password: 0 })
    .toArray();

  res.json({ success: true, users: followingUsers });
});

// GET /M01031166/profile/:username/followers
// List of users that follow :username

app.get(`/${M01031166}/profile/:username/followers`, async (req, res) => {
  const username = req.params.username;

  const followers = await users
    .find({ follows: username })
    .project({ password: 0 })
    .toArray();

  res.json({ success: true, users: followers });
});
// ******* IMAGE UPLOADS *******

// Profile picture upload
// POST /M01031166/upload/profile

app.post(
  `/${M01031166}/upload/profile`,
  requireLogin,
  profileUpload.single("image"),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const url = `/uploads/profile/${req.file.filename}`;

    await users.updateOne(
      { username: req.session.username },
      { $set: { profilePic: url } }
    );

    res.json({ success: true, url });
  }
);

// Car images upload
// POST /M01031166/upload/car

app.post(
  `/${M01031166}/upload/car`,
  requireLogin,
  carUpload.array("images", 3),
  (req, res) => {
    if (!req.files || !req.files.length) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });
    }

    const urls = req.files.map(f => `/uploads/cars/${f.filename}`);
    res.json({ success: true, urls });
  }
);

// ******* FAVOURITES (SAVED CARS) *******

// ADD TO FAVOURITES
// POST /M01031166/favourites

app.post(`/${M01031166}/favourites`, requireLogin, async (req, res) => {
  const { listingId } = req.body;
  if (!listingId) {
    return res
      .status(400)
      .json({ success: false, message: "listingId is required" });
  }

  const id = toObjectId(listingId);
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid listingId" });
  }

  const existing = await favourites.findOne({
    username: req.session.username,
    listingId: id
  });
  if (existing) {
    return res.json({ success: true, message: "Already in favourites" });
  }

  await favourites.insertOne({
    username: req.session.username,
    listingId: id,
    createdAt: new Date()
  });

  res.json({ success: true, message: "Added to favourites" });
});

// REMOVE FROM FAVOURITES
// DELETE /M01031166/favourites

app.delete(`/${M01031166}/favourites`, requireLogin, async (req, res) => {
  const { listingId } = req.body;
  if (!listingId) {
    return res
      .status(400)
      .json({ success: false, message: "listingId is required" });
  }

  const id = toObjectId(listingId);
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid listingId" });
  }

  await favourites.deleteOne({
    username: req.session.username,
    listingId: id
  });

  res.json({ success: true, message: "Removed from favourites" });
});

// LIST USER'S FAVOURITES
// GET /M01031166/favourites

app.get(`/${M01031166}/favourites`, requireLogin, async (req, res) => {
  const favDocs = await favourites
    .find({ username: req.session.username })
    .toArray();

  const ids = favDocs.map(f => f.listingId);
  if (!ids.length) {
    return res.json({ success: true, results: [] });
  }

  const listings = await contents
    .find({ _id: { $in: ids } })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, results: listings });
});

// ******* MESSAGES *******

// SEND MESSAGE
// POST /M01031166/messages

app.post(`/${M01031166}/messages`, requireLogin, async (req, res) => {
  const { to, text } = req.body;

  if (!to || !text) {
    return res
      .status(400)
      .json({ success: false, message: "to and text are required" });
  }

  if (to === req.session.username) {
    return res.json({
      success: false,
      message: "You cannot send messages to yourself"
    });
  }

  const target = await users.findOne({ username: to });
  if (!target) {
    return res
      .status(404)
      .json({ success: false, message: "Recipient not found" });
  }

  await messages.insertOne({
    from: req.session.username,
    to,
    text,
    createdAt: new Date()
  });

  res.json({ success: true, message: "Message sent" });
});

// GET MESSAGES IN A CONVERSATION
// GET /M01031166/messages?with=username

app.get(`/${M01031166}/messages`, requireLogin, async (req, res) => {
  const other = req.query.with;
  if (!other) {
    return res.status(400).json({
      success: false,
      message: "Query parameter 'with' is required"
    });
  }

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

// LIST CONVERSATIONS (LAST MESSAGE PER USER)
// GET /M01031166/conversations

app.get(`/${M01031166}/conversations`, requireLogin, async (req, res) => {
  const username = req.session.username;

  const convs = await messages
    .aggregate([
      {
        $match: {
          $or: [{ from: username }, { to: username }]
        }
      },
      {
        $project: {
          with: {
            $cond: [{ $eq: ["$from", username] }, "$to", "$from"]
          },
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

// This route handles the DVLA vehicle lookup feature. When the user enters a
// registration number on the website, the front end sends it here. I clean the
// input (uppercase + remove spaces) and then make a request to the official DVLA
// API using my server-side key. If the lookup works, I return the vehicle data
// back to the front end so the form can auto-fill. If the DVLA API returns an
// error (wrong reg, expired MOT, bad request, etc.), I catch it and send back a
// clear error message instead of crashing the server.
// POST /M01031166/vehicle

app.post(`/${M01031166}/vehicle`, async (req, res) => {
  const { registrationNumber } = req.body;

  if (!registrationNumber) {
    return res.status(400).json({
      success: false,
      message: "registrationNumber is required"
    });
  }

  const cleanedReg = registrationNumber.toUpperCase().replace(/\s+/g, "");

  try {
    const response = await axios.post(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      { registrationNumber: cleanedReg },
      {
        headers: {
          "x-api-key": DVLA_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );

    return res.json({
      success: true,
      data: response.data
    });
  } catch (err) {
    console.error("DVLA error:", err.response?.data || err.message);
    const status = err.response?.status || 500;

    return res.status(status).json({
      success: false,
      message: "DVLA API error",
      error: err.response?.data || null
    });
  }
});



// ******* DELETE LISTING *******
// DELETE /M01031166/listings/:id

app.delete(`/${M01031166}/listings/:id`, requireLogin, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.json({ success: false, message: "Invalid listing ID" });

  const listing = await contents.findOne({ _id: id });
  if (!listing)
    return res.json({ success: false, message: "Listing not found" });

  if (listing.ownerUsername !== req.session.username) {
    return res.json({ success: false, message: "Not your listing" });
  }

  await contents.deleteOne({ _id: id });

  res.json({ success: true, message: "Listing deleted" });
});

// ******* LIKE & COMMENT ON LISTINGS *******

// TOGGLE LIKE ON LISTING
// POST /M01031166/listings/:id/like

app.post(`/${M01031166}/listings/:id/like`, requireLogin, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) {
    return res.json({ success: false, message: "Invalid listing ID" });
  }

  const listing = await contents.findOne({ _id: id });
  if (!listing) {
    return res.json({ success: false, message: "Listing not found" });
  }

  const username = req.session.username;
  const likes = listing.likes || [];
  const alreadyLiked = likes.includes(username);

  if (alreadyLiked) {
    await contents.updateOne(
      { _id: id },
      { $pull: { likes: username } }
    );
  } else {
    await contents.updateOne(
      { _id: id },
      { $addToSet: { likes: username } }
    );
  }

  const updated = await contents.findOne({ _id: id });
  const count = (updated.likes || []).length;

  res.json({
    success: true,
    liked: !alreadyLiked,
    count
  });
});

// ADD COMMENT TO LISTING
// POST /M01031166/listings/:id/comments

app.post(
  `/${M01031166}/listings/:id/comments`,
  requireLogin,
  async (req, res) => {
    const id = toObjectId(req.params.id);
    if (!id) {
      return res.json({ success: false, message: "Invalid listing ID" });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.json({ success: false, message: "Comment text is required" });
    }

    const listing = await contents.findOne({ _id: id });
    if (!listing) {
      return res.json({ success: false, message: "Listing not found" });
    }

    const comment = {
      username: req.session.username,
      text: text.trim(),
      createdAt: new Date()
    };

    await contents.updateOne(
      { _id: id },
      { $push: { comments: comment } }
    );

    res.json({ success: true, comment });
  }
);

// ******* MY LISTINGS *******
//user is able to see their own listings 
// GET /M01031166/my-listings

app.get(`/${M01031166}/my-listings`, requireLogin, async (req, res) => {
  const docs = await contents
    .find({ ownerUsername: req.session.username })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, listings: docs });
});

// ******* START SERVER *******

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
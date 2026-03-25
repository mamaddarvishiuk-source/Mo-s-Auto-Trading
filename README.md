# Mo's Auto Trading

A full-stack UK vehicle marketplace with DVLA integration and AI price analysis.

**Live:** [moautotrading.com](https://moautotrading.com)

---

## Features

- **Browse & Search** — filter listings by make, model, year, fuel type, and price
- **DVLA Integration** — check any UK registration for MOT status, tax due date, and vehicle history
- **AI Price Analysis** — machine learning model assesses whether a listing is fairly priced, a bargain, or overpriced
- **Sell Your Car** — auto-fill listing details from DVLA, upload up to 3 photos
- **Messaging** — direct messaging between buyers and sellers
- **Saved Vehicles** — bookmark listings to revisit later
- **Follow System** — follow sellers and dealers to see their listings in your feed
- **User Profiles** — manage your listings, profile photo, followers, and following

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | Node.js, Express (ESM)              |
| Database    | MongoDB (via official driver)       |
| Auth        | express-session + bcryptjs          |
| File upload | Multer                              |
| AI/ML       | Python (price analysis service)     |
| DVLA        | DVLA Vehicle Enquiry API            |
| Frontend    | Vanilla JS (modular), HTML5, CSS3   |
| Hosting     | Render                              |

---

## Project Structure

```
├── server.mjs              # Express app entry point
├── db.js                   # MongoDB connection singleton
├── routes/
│   ├── authRoutes.js       # Register, login, logout, session
│   ├── listingRoutes.js    # CRUD for vehicle listings
│   ├── vehicleRoutes.js    # DVLA lookup, favourites, comments
│   ├── messageRoutes.js    # Conversations and messages
│   ├── uploadRoutes.js     # Profile photo upload
│   └── aiRoutes.js         # AI price analysis endpoints
├── services/
│   ├── dvlaService.js      # DVLA API wrapper
│   ├── aiService.js        # AI service client
│   ├── priceAnalysisService.js
│   ├── vehicleEnrichmentService.js
│   ├── vehicleImageService.js
│   └── vehicleValuationService.js
├── middleware/
│   └── auth.js             # requireLogin middleware
├── utils/
│   └── helpers.js          # toObjectId and shared utilities
├── ai-service/             # Python ML price analysis service
└── public/
    ├── index.html          # Single-page app shell
    ├── css/style.css
    └── js/
        ├── app.js          # Entry point — initialises all modules
        ├── auth.js         # Login / register
        ├── feed.js         # Listing feed
        ├── listings.js     # Create / view listings
        ├── dvla.js         # DVLA check section
        ├── messages.js     # Messaging
        ├── users.js        # User search and profiles
        ├── follow.js       # Follow / unfollow
        ├── homepage.js     # Homepage stats and featured listings
        ├── navigation.js   # Section switching + hamburger menu
        ├── ui.js           # Flash messages, shared UI helpers
        └── utils.js        # Shared utility functions
```

---

## Getting Started (Local)

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Setup

```bash
# Clone the repo
git clone https://github.com/mamaddarvishiuk-source/Mo-s-Auto-Trading.git
cd Mo-s-Auto-Trading

# Install dependencies
npm install

# Create a .env file
echo "MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority" > .env
echo "SESSION_SECRET=your-secret-here" >> .env

# Start the server
npm start
```

The app runs on `http://localhost:3000` by default.

---

## Deployment (Render)

1. Connect the GitHub repo to a new Render **Web Service**
2. Set **Build Command:** `npm install`
3. Set **Start Command:** `node server.mjs`
4. Add the following **Environment Variables** in Render dashboard:
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `SESSION_SECRET` — a long random string

---

## Environment Variables

| Variable        | Description                            |
|-----------------|----------------------------------------|
| `MONGODB_URI`   | MongoDB Atlas connection string        |
| `SESSION_SECRET`| Secret used to sign session cookies    |

import "dotenv/config";
import { MongoClient } from "mongodb";

const mongoClient = new MongoClient(process.env.MONGODB_URI);

await mongoClient.connect();
console.log("Connected to MongoDB");

export const db = mongoClient.db("mo_auto_trading");

// Collections — import these directly in route files
export const users = db.collection("users");
export const contents = db.collection("contents");
export const favourites = db.collection("favourites");
export const messages = db.collection("messages");

import { ObjectId } from "mongodb";

/**
 * Safely converts a string to a MongoDB ObjectId.
 * Returns null instead of throwing if the format is invalid.
 */
export function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

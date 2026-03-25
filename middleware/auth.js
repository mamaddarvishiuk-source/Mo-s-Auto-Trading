/**
 * Authentication middleware
 * Protects routes that require a logged-in session.
 */
export function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }
  next();
}

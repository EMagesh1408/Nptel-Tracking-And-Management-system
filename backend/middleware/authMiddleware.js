const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the JWT and attaches the user to req.user
const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    if (req.user.active === false) {
      return res.status(401).json({ message: "This account has been disabled. Please contact the administrator." });
    }
    // A password reset by the admin signs the user out of any older session.
    if (req.user.passwordChangedAt && Math.floor(req.user.passwordChangedAt.getTime() / 1000) > decoded.iat) {
      return res.status(401).json({ message: "Your password was changed. Please sign in again." });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

// Restricts a route to a set of roles, e.g. authorize("admin", "hod")
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role privileges" });
    }
    next();
  };
};

module.exports = { protect, authorize };

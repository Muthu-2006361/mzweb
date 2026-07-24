const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "MzAptiCode_2026_Secure_Mzcet_Key9117_9X7@kL#8mN$2pQ!5rT";

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "10h" });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please login again." });
    }
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
}

module.exports = { generateToken, verifyToken };
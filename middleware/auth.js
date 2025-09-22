const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  // 1. Get the token from the request header
  const token = req.header("x-auth-token");

  // 2. Check if a token exists
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }

  // 3. Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user's information from the token payload to the request object
    req.user = decoded.user;
    next(); // Move on to the next middleware or route handler
  } catch (err) {
    // This runs if the token is invalid (e.g., expired, tampered with)
    res.status(401).json({ message: "Token is not valid." });
  }
};

module.exports = auth;

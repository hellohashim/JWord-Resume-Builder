const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    // The token comes in as "Bearer <token>", so we split it to get just the token part
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the user ID to the request object
    req.userId = decoded.userId; 
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
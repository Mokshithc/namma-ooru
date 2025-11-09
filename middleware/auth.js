const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request
  req.user = {
      id: decoded.userId || decoded.id,  // Handle both formats
      email: decoded.email,
      role: decoded.role || 'user'
    };
    
// Debug log

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { 
  auth: authenticate,      
  authenticate             

}


console.log(process.env.JWT_SECRET);

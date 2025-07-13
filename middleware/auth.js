const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// JWT Authentication Middleware
const verifyJWT = async (req, res, next) => {
  console.log('verifyJWT middleware called');
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is approved (for students)
    if (user.role === 'student' && !user.approved) {
      return res.status(403).json({
        success: false,
        message: 'Account not approved. Please contact administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based Access Control Middleware
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Insufficient permissions.'
      });
    }

    next();
  };
};

// Admin only middleware
const requireAdmin = requireRole('admin');

// Student only middleware
const requireStudent = (req, res, next) => {
  console.log('requireStudent middleware called');
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden. Insufficient permissions.'
    });
  }
  next();
};

// Optional authentication (for public routes that can work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    req.user = user || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  verifyJWT,
  authenticateToken: verifyJWT,
  requireRole,
  requireAdmin,
  requireStudent,
  optionalAuth
}; 
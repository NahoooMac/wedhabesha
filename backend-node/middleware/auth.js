const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// JWT authentication middleware for regular users
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Handle different token structures
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.error('No userId found in token:', decoded);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token structure'
      });
    }
    
    // Get user from database
    const result = await query(
      'SELECT id, email, user_type, auth_provider, is_active FROM users WHERE id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      console.error('User not found for ID:', userId);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or expired token'
    });
  }
};

// Staff authentication middleware for staff sessions
const authenticateStaff = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Staff session expired. Please log in again.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if this is a staff session token
    if (decoded.type !== 'staff_session') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid staff session'
      });
    }

    // Verify wedding still exists and is active
    const weddingResult = await query(
      'SELECT id, wedding_code, wedding_date, venue_name, expected_guests FROM weddings WHERE id = ?',
      [decoded.weddingId]
    );

    if (weddingResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Wedding not found'
      });
    }

    const wedding = weddingResult.rows[0];

    // Add staff session info to request
    req.staffSession = {
      weddingId: decoded.weddingId,
      weddingCode: decoded.weddingCode,
      wedding: wedding
    };

    next();
  } catch (error) {
    console.error('Staff token verification error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Staff session expired. Please log in again.'
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.user_type)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await query(
      'SELECT id, email, user_type, auth_provider, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].is_active) {
      req.user = result.rows[0];
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = {
  authenticateToken,
  authenticateStaff,
  requireRole,
  optionalAuth
};
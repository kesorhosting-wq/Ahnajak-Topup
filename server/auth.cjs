/**
 * auth.cjs — JWT auth helpers + Express middleware
 * Replaces Supabase Auth (signup, signin, session, roles)
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query, queryOne } = require('./db.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-random-long-string';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '365d';

/**
 * Sign a JWT for a user object { id, email, display_name }
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, display_name: user.display_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Hash a plaintext password using bcrypt.
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Check if a user has a specific role in the user_roles table.
 */
async function hasRole(userId, role) {
  const row = await queryOne(
    'SELECT 1 FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1',
    [userId, role]
  );
  return !!row;
}

/**
 * Express middleware: require a valid JWT (any authenticated user).
 * Attaches req.user = { id, email, display_name }
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email, display_name: decoded.display_name };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/**
 * Express middleware: require the 'admin' role.
 * Automatically validates JWT token if not already run by requireAuth.
 */
async function requireAdmin(req, res, next) {
  if (!req.user) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email, display_name: decoded.display_name };
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  }
  
  const isAdmin = await hasRole(req.user.id, 'admin');
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Optional auth: attach req.user if a valid token is present, but don't fail.
 */
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email, display_name: decoded.display_name };
    } catch {
      // ignore — leave req.user undefined
    }
  }
  next();
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  signToken,
  hashPassword,
  comparePassword,
  hasRole,
  requireAuth,
  requireAdmin,
  optionalAuth,
};

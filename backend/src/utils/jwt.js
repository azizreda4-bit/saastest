const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate JWT token
 */
function generateToken(payload, options = {}) {
  const defaultOptions = {
    expiresIn: config.jwt.expiresIn,
    issuer: 'deliveryhub-api',
    audience: 'deliveryhub-client',
  };

  return jwt.sign(payload, config.jwt.secret, { ...defaultOptions, ...options });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
  return generateToken(payload, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Decode JWT token without verification
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Check if token is expired
 */
function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
};
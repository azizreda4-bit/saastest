const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(config.encryption.key, 'utf8');

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  try {
    if (typeof encryptedData === 'string') {
      // Handle simple string encryption (fallback)
      const decipher = crypto.createDecipher(ALGORITHM, KEY);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    
    const { encrypted, iv, authTag } = encryptedData;
    const decipher = crypto.createDecipherGCM(ALGORITHM, KEY);
    
    decipher.setIV(Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash password
 */
function hashPassword(password) {
  return crypto.pbkdf2Sync(password, KEY, 100000, 64, 'sha512').toString('hex');
}

/**
 * Verify password
 */
function verifyPassword(password, hash) {
  const hashedPassword = hashPassword(password);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedPassword));
}

/**
 * Generate random token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate API key
 */
function generateApiKey(prefix = 'dh') {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

module.exports = {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateToken,
  generateApiKey
};
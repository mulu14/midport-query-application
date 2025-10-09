/**
 * @fileoverview Encryption utility for securing tenant credentials
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

// Try different import methods for compatibility
let createCipherGCM: any, createDecipherGCM: any, randomBytes: any, createHash: any;

try {
  // Modern Node.js import
  const crypto = require('crypto');
  createCipherGCM = crypto.createCipherGCM;
  createDecipherGCM = crypto.createDecipherGCM;
  randomBytes = crypto.randomBytes;
  createHash = crypto.createHash;
} catch (error) {
  // Fallback - disable encryption if crypto is not available
  console.warn('Crypto module not available, using fallback');
}

/**
 * Encryption utility class for tenant credential security
 * Uses AES-256-GCM encryption for secure storage of sensitive data
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits

  /**
   * Generate or retrieve encryption key from environment
   * In production, this should be loaded from a secure key management service
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.TENANT_ENCRYPTION_KEY;
    
    if (!key) {
      // Generate a new key if none exists (for development)
      // In production, this should be a pre-generated secure key
      const newKey = randomBytes(this.KEY_LENGTH).toString('hex');
      console.warn(`
⚠️  TENANT_ENCRYPTION_KEY not found in environment variables.
For production deployment, add this to your .env.local:
TENANT_ENCRYPTION_KEY=${newKey}

Using temporary key for current session.
      `);
      return Buffer.from(newKey, 'hex');
    }
    
    return Buffer.from(key, 'hex');
  }

  /**
   * Encrypt sensitive data
   * @param data - The data to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  static encrypt(data: string): string {
    try {
      if (!createCipherGCM || !randomBytes) {
        // Fallback to simple base64 encoding for development
        console.warn('Crypto not available, using base64 fallback (NOT SECURE)');
        return Buffer.from(data).toString('base64');
      }
      
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.IV_LENGTH);
      
      const cipher = createCipherGCM(this.ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from('tenant-config', 'utf8'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
      return combined;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param encryptedData - The encrypted data with IV and auth tag
   * @returns Decrypted data
   */
  static decrypt(encryptedData: string): string {
    try {
      if (!createDecipherGCM) {
        // Fallback to simple base64 decoding for development
        console.warn('Crypto not available, using base64 fallback (NOT SECURE)');
        return Buffer.from(encryptedData, 'base64').toString('utf8');
      }
      
      const key = this.getEncryptionKey();
      const parts = encryptedData.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = createDecipherGCM(this.ALGORITHM, key, iv);
      decipher.setAAD(Buffer.from('tenant-config', 'utf8'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash a string for use as database ID
   * @param input - The input string to hash
   * @returns SHA-256 hash of the input
   */
  static hashForId(input: string): string {
    return createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  /**
   * Generate a secure random ID
   * @returns Random UUID-like string
   */
  static generateId(): string {
    return randomBytes(16).toString('hex');
  }
}

/**
 * Simple fallback encryption for environments without crypto support
 * WARNING: This is for development only and should never be used in production
 */
export class FallbackEncryption {
  private static readonly SECRET = 'fallback-dev-secret-key';

  static encrypt(data: string): string {
    if (typeof window !== 'undefined') {
      // Browser environment - use base64 encoding (NOT secure)
      return Buffer.from(data).toString('base64');
    }
    return EncryptionUtil.encrypt(data);
  }

  static decrypt(encryptedData: string): string {
    if (typeof window !== 'undefined') {
      // Browser environment - decode base64 (NOT secure)
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    }
    return EncryptionUtil.decrypt(encryptedData);
  }
}
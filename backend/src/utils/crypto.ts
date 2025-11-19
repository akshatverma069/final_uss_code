import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Hash password using SHA-256 (matching database format)
 */
export const hashPasswordSHA256 = (password: string): string => {
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return `sha256$${hash}`;
};

/**
 * Verify password against SHA-256 hash
 */
export const verifyPasswordSHA256 = (password: string, hash: string): boolean => {
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  return hash === `sha256$${passwordHash}` || hash === passwordHash;
};

/**
 * Hash password using bcrypt (for admin passwords)
 */
export const hashPasswordBcrypt = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify password using bcrypt
 */
export const verifyPasswordBcrypt = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

/**
 * Calculate password strength (0-100)
 */
export const calculatePasswordStrength = (password: string): number => {
  let score = 0;

  // Length check
  if (password.length >= 12) score += 25;
  else if (password.length >= 8) score += 15;
  else if (password.length >= 6) score += 5;

  // Character variety
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;

  // Check for weak patterns
  const weakPatterns = [
    /^[0-9]+$/, // Only numbers
    /^[a-zA-Z]+$/, // Only letters
    /^(.)\1+$/, // All same character
    /^12345/, // Sequential numbers
    /^abcde/i, // Sequential letters
    /^qwerty/i, // Keyboard patterns
    /^password/i, // Common words
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      score -= 20;
      break;
    }
  }

  // Check for common words
  const commonWords = ['password', 'admin', 'welcome', 'qwerty', '12345'];
  const lowerPassword = password.toLowerCase();
  for (const word of commonWords) {
    if (lowerPassword.includes(word)) {
      score -= 15;
      break;
    }
  }

  // Check for repetition
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
};


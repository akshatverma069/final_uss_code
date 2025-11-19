/**
 * Password Security Service
 * Provides comprehensive password security checking similar to real-world password managers
 */

export interface PasswordCheckResult {
  strength: "weak" | "medium" | "strong" | "very-strong";
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  isCompromised: boolean;
  isReused: boolean;
  isWeak: boolean;
}

export interface PasswordAnalysis {
  totalPasswords: number;
  compromisedCount: number;
  weakCount: number;
  reusedCount: number;
  strongCount: number;
  healthScore: number; // 0-100
  compromisedPasswords: CompromisedPassword[];
  weakPasswords: WeakPassword[];
  reusedPasswords: ReusedPassword[];
}

export interface CompromisedPassword {
  id: string;
  platform: string;
  username: string;
  password: string;
  breachCount: number;
  lastBreachDate?: string;
}

export interface WeakPassword {
  id: string;
  platform: string;
  username: string;
  password: string;
  score: number;
  issues: string[];
}

export interface ReusedPassword {
  id: string;
  platform: string;
  username: string;
  password: string;
  reuseCount: number;
  usedIn: string[];
}

// Simulated compromised passwords database (in real app, this would use Have I Been Pwned API)
const COMPROMISED_PASSWORDS = new Set([
  "password123",
  "password",
  "12345678",
  "qwerty",
  "abc123",
  "monkey",
  "1234567890",
  "letmein",
  "trustno1",
  "dragon",
  "baseball",
  "iloveyou",
  "master",
  "sunshine",
  "ashley",
  "bailey",
  "passw0rd",
  "shadow",
  "123123",
  "654321",
  "superman",
  "qazwsx",
  "michael",
  "football",
  "welcome",
  "jesus",
  "ninja",
  "mustang",
  "password1",
  "123456",
  "admin",
  "root",
  "toor",
  "test",
  "guest",
]);

// Common weak password patterns
const WEAK_PATTERNS = [
  /^[0-9]+$/, // Only numbers
  /^[a-zA-Z]+$/, // Only letters
  /^(.)\1+$/, // All same character
  /^12345/, // Sequential numbers
  /^abcde/i, // Sequential letters
  /^qwerty/i, // Keyboard patterns
  /^password/i, // Common words
];

export class PasswordSecurityService {
  /**
   * Check if a password is compromised (found in data breaches)
   * In production, this would use the Have I Been Pwned API
   */
  static async checkCompromised(password: string): Promise<boolean> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In production, hash password with SHA-1 and check first 5 characters against HIBP API
    // For now, check against known compromised passwords list
    const normalizedPassword = password.toLowerCase().trim();
    return COMPROMISED_PASSWORDS.has(normalizedPassword);
  }

  /**
   * Calculate password strength
   */
  static calculateStrength(password: string): PasswordCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      issues.push("Password is too short (minimum 8 characters)");
      recommendations.push("Use at least 12 characters for better security");
    } else if (password.length >= 12) {
      score += 25;
    } else {
      score += 15;
    }

    // Character variety checks
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasLowercase) {
      issues.push("Missing lowercase letters");
      recommendations.push("Add lowercase letters");
    } else {
      score += 15;
    }

    if (!hasUppercase) {
      issues.push("Missing uppercase letters");
      recommendations.push("Add uppercase letters");
    } else {
      score += 15;
    }

    if (!hasNumbers) {
      issues.push("Missing numbers");
      recommendations.push("Add numbers");
    } else {
      score += 15;
    }

    if (!hasSpecial) {
      issues.push("Missing special characters");
      recommendations.push("Add special characters (!@#$%^&*)");
    } else {
      score += 20;
    }

    // Check for weak patterns
    for (const pattern of WEAK_PATTERNS) {
      if (pattern.test(password)) {
        issues.push("Password contains weak patterns");
        recommendations.push("Avoid common patterns and sequences");
        score -= 20;
        break;
      }
    }

    // Check for common words
    const commonWords = ["password", "admin", "welcome", "qwerty", "12345"];
    const lowerPassword = password.toLowerCase();
    for (const word of commonWords) {
      if (lowerPassword.includes(word)) {
        issues.push(`Contains common word: "${word}"`);
        recommendations.push("Avoid common words and phrases");
        score -= 15;
        break;
      }
    }

    // Check for repetition
    if (/(.)\1{2,}/.test(password)) {
      issues.push("Contains repeating characters");
      recommendations.push("Avoid repeating characters");
      score -= 10;
    }

    // Calculate strength level
    let strength: "weak" | "medium" | "strong" | "very-strong";
    if (score < 40) {
      strength = "weak";
    } else if (score < 60) {
      strength = "medium";
    } else if (score < 80) {
      strength = "strong";
    } else {
      strength = "very-strong";
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      strength,
      score,
      issues,
      recommendations,
      isCompromised: false, // Will be set separately
      isReused: false, // Will be set separately
      isWeak: strength === "weak" || score < 40,
    };
  }

  /**
   * Check if password is reused across multiple accounts
   */
  static checkReused(
    password: string,
    allPasswords: Array<{ id: string; platform: string; username: string; password: string }>
  ): { isReused: boolean; reuseCount: number; usedIn: string[] } {
    const normalizedPassword = password.toLowerCase().trim();
    const matches = allPasswords.filter(
      (p) => p.password.toLowerCase().trim() === normalizedPassword
    );

    return {
      isReused: matches.length > 1,
      reuseCount: matches.length,
      usedIn: matches.map((m) => `${m.platform} (${m.username})`),
    };
  }

  /**
   * Analyze all passwords and provide comprehensive security report
   */
  static async analyzePasswords(
    passwords: Array<{
      id: string;
      platform: string;
      username: string;
      password: string;
    }>
  ): Promise<PasswordAnalysis> {
    const compromisedPasswords: CompromisedPassword[] = [];
    const weakPasswords: WeakPassword[] = [];
    const reusedPasswordsMap = new Map<string, ReusedPassword>();
    let strongCount = 0;

    // Analyze each password
    for (const pwd of passwords) {
      // Check if compromised
      const isCompromised = await this.checkCompromised(pwd.password);
      if (isCompromised) {
        compromisedPasswords.push({
          id: pwd.id,
          platform: pwd.platform,
          username: pwd.username,
          password: pwd.password,
          breachCount: 1, // Simulated
          lastBreachDate: "2024-01-15", // Simulated
        });
      }

      // Check strength
      const strengthResult = this.calculateStrength(pwd.password);
      if (strengthResult.isWeak || strengthResult.strength === "weak") {
        weakPasswords.push({
          id: pwd.id,
          platform: pwd.platform,
          username: pwd.username,
          password: pwd.password,
          score: strengthResult.score,
          issues: strengthResult.issues,
        });
      } else if (strengthResult.strength === "strong" || strengthResult.strength === "very-strong") {
        strongCount++;
      }

      // Check for reuse
      const reuseCheck = this.checkReused(pwd.password, passwords);
      if (reuseCheck.isReused) {
        const key = pwd.password.toLowerCase().trim();
        if (!reusedPasswordsMap.has(key)) {
          reusedPasswordsMap.set(key, {
            id: pwd.id,
            platform: pwd.platform,
            username: pwd.username,
            password: pwd.password,
            reuseCount: reuseCheck.reuseCount,
            usedIn: reuseCheck.usedIn,
          });
        }
      }
    }

    const reusedPasswords = Array.from(reusedPasswordsMap.values());
    const totalPasswords = passwords.length;
    const compromisedCount = compromisedPasswords.length;
    const weakCount = weakPasswords.length;
    const reusedCount = reusedPasswords.length;

    // Calculate health score (0-100)
    // Formula: (strong passwords / total) * 100, with penalties for compromised, weak, and reused
    let healthScore = (strongCount / totalPasswords) * 100;
    healthScore -= (compromisedCount / totalPasswords) * 50; // Heavy penalty for compromised
    healthScore -= (weakCount / totalPasswords) * 30; // Penalty for weak
    healthScore -= (reusedCount / totalPasswords) * 20; // Penalty for reused
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    return {
      totalPasswords,
      compromisedCount,
      weakCount,
      reusedCount,
      strongCount,
      healthScore,
      compromisedPasswords,
      weakPasswords,
      reusedPasswords,
    };
  }

  /**
   * Get security recommendations based on analysis
   */
  static getSecurityRecommendations(analysis: PasswordAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.compromisedCount > 0) {
      recommendations.push(
        `Change ${analysis.compromisedCount} compromised password${analysis.compromisedCount > 1 ? "s" : ""} immediately`
      );
    }

    if (analysis.weakCount > 0) {
      recommendations.push(
        `Strengthen ${analysis.weakCount} weak password${analysis.weakCount > 1 ? "s" : ""}`
      );
    }

    if (analysis.reusedCount > 0) {
      recommendations.push(
        `Replace ${analysis.reusedCount} reused password${analysis.reusedCount > 1 ? "s" : ""} with unique ones`
      );
    }

    if (analysis.healthScore < 50) {
      recommendations.push("Your password security needs immediate attention");
    } else if (analysis.healthScore < 75) {
      recommendations.push("Your password security is good but can be improved");
    } else {
      recommendations.push("Your passwords are secure! Keep up the good work.");
    }

    return recommendations;
  }
}


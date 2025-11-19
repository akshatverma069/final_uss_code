/**
 * Mock Password Data Service
 * Provides sample password data for testing security features
 */

export interface MockPassword {
  id: string;
  platform: string;
  username: string;
  password: string;
}

export const MOCK_PASSWORDS: MockPassword[] = [
  // Compromised passwords
  { id: "1", platform: "Google", username: "user1@gmail.com", password: "password123" },
  { id: "2", platform: "Facebook", username: "user1@facebook.com", password: "password123" },
  { id: "3", platform: "Amazon", username: "user@amazon.com", password: "qwerty" },
  
  // Weak passwords
  { id: "4", platform: "ITD", username: "student@itd.ac.in", password: "12345678" },
  { id: "5", platform: "Netflix", username: "user@netflix.com", password: "abc123" },
  { id: "6", platform: "Instagram", username: "user@instagram.com", password: "password" },
  { id: "7", platform: "Twitter", username: "user@twitter.com", password: "admin" },
  { id: "8", platform: "LinkedIn", username: "user@linkedin.com", password: "welcome" },
  
  // Reused passwords
  { id: "9", platform: "GitHub", username: "dev@github.com", password: "MySecureP@ss123!" },
  { id: "10", platform: "GitLab", username: "dev@gitlab.com", password: "MySecureP@ss123!" },
  { id: "11", platform: "Bitbucket", username: "dev@bitbucket.com", password: "MySecureP@ss123!" },
  
  // Strong passwords
  { id: "12", platform: "Bank", username: "user@bank.com", password: "Kx9#mP2$vL8@nQ5!" },
  { id: "13", platform: "PayPal", username: "user@paypal.com", password: "Rt7&bN4*wH3@jM6!" },
  { id: "14", platform: "Stripe", username: "user@stripe.com", password: "Yp5$cV9#xZ2@kL8!" },
  
  // Medium strength
  { id: "15", platform: "Spotify", username: "user@spotify.com", password: "MusicLover2024!" },
  { id: "16", platform: "YouTube", username: "user@youtube.com", password: "VideoWatcher99!" },
];

/**
 * Get all mock passwords
 */
export function getAllMockPasswords(): MockPassword[] {
  return MOCK_PASSWORDS;
}

/**
 * Get passwords by platform
 */
export function getPasswordsByPlatform(platform: string): MockPassword[] {
  return MOCK_PASSWORDS.filter((p) => p.platform.toLowerCase() === platform.toLowerCase());
}


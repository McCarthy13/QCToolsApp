/**
 * Password validation utilities for Precast Quality Tools
 */

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

/**
 * Validate password requirements:
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * - No length requirement
 */
export function validatePassword(password: string): PasswordValidation {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const errors: string[] = [];

  if (!hasUpper) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLower) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumber) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecial) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  };
}

/**
 * Generate a temporary password that meets all requirements
 */
export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O for clarity
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // Removed l for clarity
  const numbers = '23456789'; // Removed 0, 1 for clarity
  const special = '!@#$%^&*';

  // Ensure at least one of each type
  const password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  // Add 4 more random characters from all sets
  const allChars = upper + lower + numbers + special;
  for (let i = 0; i < 4; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the password
  return password.sort(() => Math.random() - 0.5).join('');
}

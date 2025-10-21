/**
 * Job Number Validation Utilities
 * 
 * Job Number Rules:
 * - Must be exactly 6 digits
 * - 2nd and 3rd digits must match
 * - Format: XYYZZZ where Y's must be the same
 * 
 * Valid examples: 255096, 144523, 366789
 * Invalid examples: 123456 (2nd≠3rd), 12345 (too short), 1234567 (too long)
 */

export interface JobNumberValidationResult {
  isValid: boolean;
  error?: string;
  cleaned?: string; // Job number with letters removed
}

/**
 * Extract 6-digit job number from string (removes letters/prefixes)
 * E.g., "E-255096" -> "255096", "Job 144523" -> "144523"
 */
export function extractJobNumber(input: string): string {
  // Remove all non-digit characters
  const digitsOnly = input.replace(/\D/g, '');
  
  // If we have more than 6 digits, try to find a valid 6-digit sequence
  if (digitsOnly.length > 6) {
    // Look for 6 consecutive digits where 2nd and 3rd match
    for (let i = 0; i <= digitsOnly.length - 6; i++) {
      const candidate = digitsOnly.substring(i, i + 6);
      if (candidate[1] === candidate[2]) {
        return candidate;
      }
    }
    // If no valid sequence found, take first 6 digits
    return digitsOnly.substring(0, 6);
  }
  
  return digitsOnly;
}

/**
 * Validate job number format
 */
export function validateJobNumber(input: string): JobNumberValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      error: 'Job number is required',
    };
  }

  const cleaned = extractJobNumber(input);

  // Check if we have exactly 6 digits
  if (cleaned.length !== 6) {
    return {
      isValid: false,
      error: `Job number must be exactly 6 digits (found ${cleaned.length})`,
      cleaned,
    };
  }

  // Check if 2nd and 3rd digits match
  const secondDigit = cleaned[1];
  const thirdDigit = cleaned[2];

  if (secondDigit !== thirdDigit) {
    return {
      isValid: false,
      error: `Invalid format: 2nd and 3rd digits must match (found ${secondDigit} and ${thirdDigit})`,
      cleaned,
    };
  }

  return {
    isValid: true,
    cleaned,
  };
}

/**
 * Format job number with optional prefix
 * E.g., "255096" -> "255096" or "E-255096" with prefix
 */
export function formatJobNumber(jobNumber: string, prefix?: string): string {
  const cleaned = extractJobNumber(jobNumber);
  if (prefix) {
    return `${prefix}-${cleaned}`;
  }
  return cleaned;
}

/**
 * Get user-friendly validation message
 */
export function getValidationMessage(result: JobNumberValidationResult): string {
  if (result.isValid) {
    return '';
  }

  if (result.error) {
    return result.error;
  }

  return 'Invalid job number format';
}

/**
 * Check if input is a valid job number format
 * Quick check without detailed error messages
 */
export function isValidJobNumber(input: string): boolean {
  const cleaned = extractJobNumber(input);
  return cleaned.length === 6 && cleaned[1] === cleaned[2];
}

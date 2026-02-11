/**
 * Formats a phone number string to (000) 000-0000 format
 * Accepts any 10-digit format and auto-formats it
 * @param value - Raw phone number string
 * @returns Formatted phone number string
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Only format if we have digits
  if (digits.length === 0) return '';
  
  // Format based on length
  if (digits.length <= 3) {
    return `(${digits}`;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  } else {
    // Limit to 10 digits
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

/**
 * Extracts just the digits from a formatted phone number
 * @param formatted - Formatted phone number string
 * @returns Raw digits only
 */
export const unformatPhoneNumber = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

/**
 * Validates if a phone number has exactly 10 digits
 * @param value - Phone number string (formatted or unformatted)
 * @returns true if valid 10-digit phone number
 */
export const isValidPhoneNumber = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10;
};

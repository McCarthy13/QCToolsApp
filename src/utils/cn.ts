import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert decimal inches to nearest 1/16" fraction with automatic reduction
 * @param decimal - decimal inch value (e.g., 0.684)
 * @returns formatted string like "11/16" or "3/8" (reduced)
 */
export function decimalToFraction(decimal: number): string {
  const absDecimal = Math.abs(decimal);
  const wholePart = Math.floor(absDecimal);
  const fractionalPart = absDecimal - wholePart;
  
  // Round to nearest 1/16
  const sixteenths = Math.round(fractionalPart * 16);
  
  // Handle special cases
  if (sixteenths === 0) {
    return wholePart > 0 ? `${wholePart}"` : '0';
  }
  
  if (sixteenths === 16) {
    return `${wholePart + 1}"`;
  }
  
  // Find GCD to reduce fraction
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };
  
  const divisor = gcd(sixteenths, 16);
  const numerator = sixteenths / divisor;
  const denominator = 16 / divisor;
  
  // Format the result
  if (wholePart > 0) {
    return `${wholePart} ${numerator}/${denominator}"`;
  }
  
  return `${numerator}/${denominator}"`;
}

/**
 * Format decimal inches with fraction equivalent
 * @param decimal - decimal inch value
 * @returns formatted string like "0.684 (≈11/16")"
 */
export function formatInchesWithFraction(decimal: number): string {
  const fractionStr = decimalToFraction(decimal);
  return `${decimal.toFixed(3)} (≈${fractionStr})`;
}

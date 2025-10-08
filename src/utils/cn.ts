import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert decimal inches to nearest 1/16" fraction (always displayed in 16ths)
 * @param decimal - decimal inch value (e.g., 0.684)
 * @returns formatted string like "11/16" (always in 16ths, not reduced)
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
  
  // Always display in 16ths (no reduction)
  // Format the result
  if (wholePart > 0) {
    return `${wholePart} ${sixteenths}/16"`;
  }
  
  return `${sixteenths}/16"`;
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

/**
 * Parse user input (decimal or fractional) to decimal inches
 * Supports formats:
 * - Decimal: "1.375", "0.75", ".5"
 * - Fraction: "5/16", "3/8", "11/16"
 * - Mixed: "1 5/16", "2 3/8"
 * @param input - user input string
 * @returns decimal value or null if invalid
 */
export function parseMeasurementInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try decimal first
  const decimalMatch = trimmed.match(/^(\d*\.?\d+)$/);
  if (decimalMatch) {
    const value = parseFloat(decimalMatch[1]);
    return isNaN(value) ? null : value;
  }

  // Try mixed number: "1 5/16"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const numerator = parseInt(mixedMatch[2]);
    const denominator = parseInt(mixedMatch[3]);
    if (denominator === 0) return null;
    return whole + (numerator / denominator);
  }

  // Try simple fraction: "5/16"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  return null;
}

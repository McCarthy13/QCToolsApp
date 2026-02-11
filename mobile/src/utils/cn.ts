import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate Greatest Common Divisor using Euclidean algorithm
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Convert decimal inches to nearest 1/16" fraction, reduced to lowest terms
 * @param decimal - decimal inch value (e.g., 0.5 -> 1/2", 0.375 -> 3/8")
 * @returns formatted string like "1/2"" or "3/8"" (calculated as 16ths, displayed reduced)
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
  
  // Reduce fraction to lowest terms
  const divisor = gcd(sixteenths, 16);
  const reducedNumerator = sixteenths / divisor;
  const reducedDenominator = 16 / divisor;
  
  // Format the result
  if (wholePart > 0) {
    return `${wholePart} ${reducedNumerator}/${reducedDenominator}"`;
  }
  
  return `${reducedNumerator}/${reducedDenominator}"`;
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

/**
 * Convert decimal feet to formatted span display
 * @param decimalFeet - span in decimal feet (e.g., 40.583)
 * @returns formatted string like "40'-7" (40.583 ft)"
 */
export function formatSpanDisplay(decimalFeet: number): string {
  const feet = Math.floor(decimalFeet);
  const remainingInches = (decimalFeet - feet) * 12;
  let wholeInches = Math.floor(remainingInches);
  const fractionalInches = remainingInches - wholeInches;

  // Round to nearest 1/16
  let sixteenths = Math.round(fractionalInches * 16);

  // Handle rounding up to next inch
  if (sixteenths === 16) {
    wholeInches += 1;
    sixteenths = 0;
  }

  let inchDisplay = '';
  if (wholeInches > 0 && sixteenths > 0) {
    inchDisplay = `${wholeInches} ${sixteenths}/16"`;
  } else if (wholeInches > 0) {
    inchDisplay = `${wholeInches}"`;
  } else if (sixteenths > 0) {
    inchDisplay = `${sixteenths}/16"`;
  } else {
    inchDisplay = `0"`;
  }

  return `${feet}'-${inchDisplay} (${decimalFeet.toFixed(3)} ft)`;
}

/**
 * Convert decimal feet to PDF span format with decimal inches and fractional equivalent
 * @param decimalFeet - span in decimal feet (e.g., 27.5416)
 * @returns object with main (27'-6.500") and fraction (≈27'-6 1/2") strings
 */
export function formatSpanForPDF(decimalFeet: number): { main: string; fraction: string } {
  const feet = Math.floor(decimalFeet);
  const remainingInches = (decimalFeet - feet) * 12;
  const wholeInches = Math.floor(remainingInches);
  const fractionalInches = remainingInches - wholeInches;

  // Main line: feet and decimal inches to 3 places
  const decimalInchStr = remainingInches.toFixed(3);
  const main = `${feet}'-${decimalInchStr}"`;

  // Fraction line: round to nearest 1/8"
  let eighths = Math.round(fractionalInches * 8);
  let adjustedWholeInches = wholeInches;

  // Handle rounding up to next inch
  if (eighths === 8) {
    adjustedWholeInches += 1;
    eighths = 0;
  }

  // Build fractional display
  let fractionStr = '';
  if (eighths === 0) {
    // No fraction, just whole inches
    fractionStr = `${feet}'-${adjustedWholeInches}"`;
  } else {
    // Reduce fraction to lowest terms
    const divisor = gcd(eighths, 8);
    const reducedNum = eighths / divisor;
    const reducedDen = 8 / divisor;
    fractionStr = `${feet}'-${adjustedWholeInches} ${reducedNum}/${reducedDen}"`;
  }

  return {
    main,
    fraction: `≈${fractionStr}`
  };
}

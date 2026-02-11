/**
 * Parses specific gravity input (single value or range) and returns calculated value
 * @param input - User input like "1.05" or "1.05-1.08" or "1.05 - 1.08"
 * @returns Object with display string and calculated midpoint value
 */
export const parseSpecificGravity = (
  input: string
): { display: string; calculated: number | undefined } => {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { display: '', calculated: undefined };
  }

  // Check for range patterns: "1.05-1.08", "1.05 - 1.08", "1.05- 1.08", "1.05 -1.08"
  const rangeMatch = trimmed.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
  
  if (rangeMatch) {
    const lower = parseFloat(rangeMatch[1]);
    const upper = parseFloat(rangeMatch[2]);
    
    if (!isNaN(lower) && !isNaN(upper)) {
      const midpoint = (lower + upper) / 2;
      // Format display consistently
      const display = `${lower}-${upper}`;
      return { display, calculated: midpoint };
    }
  }
  
  // Single value
  const single = parseFloat(trimmed);
  if (!isNaN(single)) {
    return { display: trimmed, calculated: single };
  }
  
  // Invalid input
  return { display: trimmed, calculated: undefined };
};

/**
 * Validates if a specific gravity input is valid
 * @param input - User input
 * @returns true if valid single value or range
 */
export const isValidSpecificGravity = (input: string): boolean => {
  const { calculated } = parseSpecificGravity(input);
  return calculated !== undefined;
};

/**
 * Gets the calculated specific gravity value for use in calculations
 * @param item - Admix library item
 * @returns Calculated SG value (midpoint if range, single value otherwise)
 */
export const getCalculatedSpecificGravity = (specificGravityDisplay?: string): number | undefined => {
  if (!specificGravityDisplay) return undefined;
  const { calculated } = parseSpecificGravity(specificGravityDisplay);
  return calculated;
};

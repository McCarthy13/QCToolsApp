/**
 * Stressing Force and Elongation Calculator Utilities
 * 
 * Standard prestressing strand properties based on ASTM A416 Grade 270
 * and industry-standard practices for hollow-core concrete manufacturing
 */

// Standard strand properties
export interface StrandProperties {
  diameter: number; // inches
  area: number; // square inches
  elasticModulus: number; // ksi (1000 psi)
  breakingStrength: number; // kips (1000 lbs)
  yieldStrength: number; // kips
}

// Standard 7-wire prestressing strand properties (ASTM A416 Grade 270)
export const STRAND_PROPERTIES: Record<string, StrandProperties> = {
  "3/8": {
    diameter: 0.375,
    area: 0.080, // sq in
    elasticModulus: 28500, // ksi
    breakingStrength: 23.0, // kips
    yieldStrength: 20.7, // kips (90% of breaking)
  },
  "1/2": {
    diameter: 0.500,
    area: 0.153, // sq in
    elasticModulus: 28500, // ksi
    breakingStrength: 41.3, // kips
    yieldStrength: 37.2, // kips (90% of breaking)
  },
  "0.6": {
    diameter: 0.600,
    area: 0.217, // sq in
    elasticModulus: 28500, // ksi
    breakingStrength: 58.6, // kips
    yieldStrength: 52.7, // kips (90% of breaking)
  },
};

export interface ElongationInputs {
  jackingForce: number; // Total jacking force in kips
  bedLength: number; // Bed length in feet
  strandSize: "3/8" | "1/2" | "0.6"; // Strand diameter
  numberOfStrands: number; // Number of strands being pulled
  bedShortening?: number; // Bed shortening in inches (optional)
  frictionLoss?: number; // Friction loss as percentage (optional)
  anchorSetLoss?: number; // Anchor set loss in inches (optional)
}

export interface ElongationResults {
  theoreticalElongation: number; // inches
  bedShortening: number; // inches
  frictionLoss: number; // inches
  anchorSetLoss: number; // inches
  totalElongation: number; // inches
  forcePerStrand: number; // kips
  stressPerStrand: number; // ksi
}

/**
 * Calculate theoretical elongation using formula:
 * Elongation = (Force × Length) / (Area × Elastic Modulus)
 * 
 * @param force - Force in kips
 * @param length - Length in inches
 * @param area - Cross-sectional area in sq inches
 * @param elasticModulus - Elastic modulus in ksi
 * @returns Elongation in inches
 */
export function calculateTheoreticalElongation(
  force: number,
  length: number,
  area: number,
  elasticModulus: number
): number {
  return (force * length) / (area * elasticModulus);
}

/**
 * Calculate expected elongation with all factors
 */
export function calculateElongation(inputs: ElongationInputs): ElongationResults {
  const strandProps = STRAND_PROPERTIES[inputs.strandSize];

  // Convert bed length from feet to inches
  const bedLengthInches = inputs.bedLength * 12;

  // Calculate force per strand
  const forcePerStrand = inputs.jackingForce / inputs.numberOfStrands;

  // Calculate stress per strand
  const stressPerStrand = forcePerStrand / strandProps.area;

  // Calculate theoretical elongation for one strand
  // Elongation = (Force × Length) / (Area × Elastic Modulus)
  const theoreticalElongation = calculateTheoreticalElongation(
    forcePerStrand,
    bedLengthInches,
    strandProps.area,
    strandProps.elasticModulus
  );

  // Bed shortening (elastic compression of the bed during stressing)
  const bedShortening = inputs.bedShortening || 0;

  // Friction loss (typically 0.5-2% of length for long beds)
  const frictionLossPercent = inputs.frictionLoss || 0;
  const frictionLoss = (frictionLossPercent / 100) * theoreticalElongation;

  // Anchor set loss (slip at anchorage during lock-off)
  const anchorSetLoss = inputs.anchorSetLoss || 0;

  // Total elongation = theoretical + bed shortening - friction - anchor set
  const totalElongation =
    theoreticalElongation + bedShortening - frictionLoss - anchorSetLoss;

  return {
    theoreticalElongation,
    bedShortening,
    frictionLoss,
    anchorSetLoss,
    totalElongation,
    forcePerStrand,
    stressPerStrand,
  };
}

/**
 * Calculate required jacking force for a desired elongation
 */
export function calculateRequiredForce(
  targetElongation: number,
  bedLength: number,
  strandSize: "3/8" | "1/2" | "0.6",
  numberOfStrands: number,
  bedShortening: number = 0
): number {
  const strandProps = STRAND_PROPERTIES[strandSize];
  const bedLengthInches = bedLength * 12;

  // Adjust for bed shortening
  const adjustedElongation = targetElongation - bedShortening;

  // Force per strand = (Elongation × Area × Elastic Modulus) / Length
  const forcePerStrand =
    (adjustedElongation * strandProps.area * strandProps.elasticModulus) /
    bedLengthInches;

  // Total force
  return forcePerStrand * numberOfStrands;
}

/**
 * Format a number to a specific decimal place with units
 */
export function formatValue(value: number, decimals: number = 3, unit: string = ""): string {
  return `${value.toFixed(decimals)}${unit}`;
}

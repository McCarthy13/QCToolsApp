/**
 * Precast Concrete Camber Calculation Utilities
 * 
 * Camber is the upward deflection built into precast concrete members to counteract
 * deflection under dead load and provide aesthetically pleasing straight lines.
 */

export interface CamberInputs {
  span: number; // Length in feet
  memberType: 'beam' | 'double-tee' | 'hollow-core' | 'single-tee' | 'solid-slab' | 'wall-panel' | 'stadia';
  releaseStrength: number; // f'ci in psi (strength at release)
  concreteStrength: number; // f'c in psi (28-day strength)
  modulusOfElasticity?: number; // Ec in psi (optional, can be calculated)
  momentOfInertia: number; // I in in^4
  deadLoad: number; // Uniform dead load in lb/ft
  liveLoad?: number; // Uniform live load in lb/ft (optional)
  strandPattern?: string; // Strand pattern ID (optional)
  strandEValue?: number; // Distance from bottom to center of strand (optional)
  topStrandPattern?: string; // Top strand pattern ID (optional)
  productWidth?: number; // Product width in inches (optional, for cut-width products)
  productSide?: 'L1' | 'L2'; // Which side is the product side (keeper side) (optional, for cut-width products)
  projectNumber?: string; // Project # (optional)
  markNumber?: string; // Mark # (optional)
  idNumber?: string; // ID # (optional)
}

export interface CamberResult {
  initialCamber: number; // inches - Prestress camber (built into form)
  netInitialCamber: number; // inches - Measured camber at release (after dead load)
  deadLoadDeflection: number; // inches
  liveLoadDeflection?: number; // inches
  longTermDeflection: number; // inches
  finalCamber: number; // inches
  recommendedCamber: number; // inches
  releaseModulusOfElasticity: number; // psi (Eci at release)
  modulusOfElasticity: number; // psi (Ec at 28 days)
  creepFactor: number;
  shrinkageFactor: number;
}

/**
 * Calculate modulus of elasticity based on ACI 318
 * Ec = 33 * w^1.5 * sqrt(f'c) for normal weight concrete (w = 145 pcf)
 */
export function calculateModulusOfElasticity(
  concreteStrength: number,
  unitWeight: number = 145
): number {
  return 33 * Math.pow(unitWeight, 1.5) * Math.sqrt(concreteStrength);
}

/**
 * Calculate initial deflection due to uniform load
 * δ = (5 * w * L^4) / (384 * E * I)
 * where w is in lb/in, L is in inches
 */
export function calculateDeflection(
  load: number, // lb/ft
  span: number, // feet
  modulusOfElasticity: number, // psi
  momentOfInertia: number // in^4
): number {
  const loadPerInch = load / 12; // Convert lb/ft to lb/in
  const spanInches = span * 12; // Convert feet to inches
  
  const deflection = (5 * loadPerInch * Math.pow(spanInches, 4)) / 
                     (384 * modulusOfElasticity * momentOfInertia);
  
  return deflection;
}

/**
 * Get creep factor based on member type and time duration
 * PCI Design Handbook recommendations
 */
export function getCreepFactor(memberType: string): number {
  const creepFactors: Record<string, number> = {
    'beam': 2.0,
    'double-tee': 2.0,
    'hollow-core': 1.8,
    'single-tee': 2.0,
    'solid-slab': 2.2,
    'wall-panel': 1.5,
    'stadia': 2.0,
  };
  
  return creepFactors[memberType] || 2.0;
}

/**
 * Get shrinkage factor based on member type
 */
export function getShrinkageFactor(memberType: string): number {
  const shrinkageFactors: Record<string, number> = {
    'beam': 0.2,
    'double-tee': 0.2,
    'hollow-core': 0.15,
    'single-tee': 0.2,
    'solid-slab': 0.25,
    'wall-panel': 0.15,
    'stadia': 0.2,
  };
  
  return shrinkageFactors[memberType] || 0.2;
}

/**
 * Calculate long-term deflection including creep and shrinkage
 * Per ACI 318: Long-term deflection = λΔ * initial deflection
 * where λΔ depends on time and compression reinforcement
 */
export function calculateLongTermDeflection(
  initialDeflection: number,
  creepFactor: number,
  shrinkageFactor: number
): number {
  // Multiplier includes creep and shrinkage effects
  const multiplier = 1 + creepFactor + shrinkageFactor;
  return initialDeflection * multiplier;
}

/**
 * Calculate recommended camber
 * Based on PCI Design Handbook recommendations
 * Camber should offset approximately 70-80% of long-term deflection
 */
export function calculateRecommendedCamber(
  deadLoadDeflection: number,
  longTermDeflection: number
): number {
  // PCI recommends camber to offset 70-80% of long-term deflection
  // This provides a slight upward camber in service while preventing sag
  return longTermDeflection * 0.75;
}

/**
 * Main camber calculation function
 */
export function calculateCamber(inputs: CamberInputs): CamberResult {
  // Calculate modulus of elasticity at release (using release strength)
  const releaseModulusOfElasticity = inputs.modulusOfElasticity || 
                               calculateModulusOfElasticity(inputs.releaseStrength);
  
  // Calculate modulus of elasticity at 28 days (using 28-day strength)
  const modulusOfElasticity28Day = calculateModulusOfElasticity(inputs.concreteStrength);
  
  // Calculate initial deflections at release (using release Ec)
  const deadLoadDeflection = calculateDeflection(
    inputs.deadLoad,
    inputs.span,
    releaseModulusOfElasticity,
    inputs.momentOfInertia
  );
  
  const liveLoadDeflection = inputs.liveLoad
    ? calculateDeflection(
        inputs.liveLoad,
        inputs.span,
        modulusOfElasticity28Day, // Use 28-day for live load
        inputs.momentOfInertia
      )
    : undefined;
  
  // Get factors
  const creepFactor = getCreepFactor(inputs.memberType);
  const shrinkageFactor = getShrinkageFactor(inputs.memberType);
  
  // Calculate long-term deflection
  const longTermDeflection = calculateLongTermDeflection(
    deadLoadDeflection,
    creepFactor,
    shrinkageFactor
  );
  
  // Calculate recommended camber
  const recommendedCamber = calculateRecommendedCamber(
    deadLoadDeflection,
    longTermDeflection
  );
  
  // Initial camber at release (typically equals recommended camber)
  const initialCamber = recommendedCamber;
  
  // Net initial camber (what you actually measure at release after dead load acts)
  const netInitialCamber = initialCamber - deadLoadDeflection;
  
  // Final camber after all deflections
  const finalCamber = initialCamber - longTermDeflection;
  
  return {
    initialCamber,
    netInitialCamber,
    deadLoadDeflection,
    liveLoadDeflection,
    longTermDeflection,
    finalCamber,
    recommendedCamber,
    releaseModulusOfElasticity,
    modulusOfElasticity: modulusOfElasticity28Day,
    creepFactor,
    shrinkageFactor,
  };
}

/**
 * Validate inputs
 */
export function validateInputs(inputs: Partial<CamberInputs>): string[] {
  const errors: string[] = [];
  
  if (!inputs.span || inputs.span <= 0) {
    errors.push("Span must be greater than 0");
  }
  
  if (!inputs.releaseStrength || inputs.releaseStrength < 3000 || inputs.releaseStrength > 10000) {
    errors.push("Release strength must be between 3000 and 10000 psi");
  }
  
  if (!inputs.concreteStrength || inputs.concreteStrength < 3000 || inputs.concreteStrength > 10000) {
    errors.push("28-day strength must be between 3000 and 10000 psi");
  }
  
  if (inputs.releaseStrength && inputs.concreteStrength && inputs.releaseStrength > inputs.concreteStrength) {
    errors.push("Release strength cannot be greater than 28-day strength");
  }
  
  if (!inputs.momentOfInertia || inputs.momentOfInertia <= 0) {
    errors.push("Moment of inertia must be greater than 0");
  }
  
  if (!inputs.deadLoad || inputs.deadLoad <= 0) {
    errors.push("Dead load must be greater than 0");
  }
  
  if (inputs.liveLoad && inputs.liveLoad < 0) {
    errors.push("Live load cannot be negative");
  }
  
  return errors;
}

/**
 * Get typical moment of inertia values for common sections
 */
export function getTypicalMomentOfInertia(memberType: string, span: number): number {
  // These are approximate values for typical sections
  const spanFactor = Math.pow(span / 30, 1.5); // Scale with span
  
  const baseValues: Record<string, number> = {
    'beam': 8000 * spanFactor,
    'double-tee': 15000 * spanFactor,
    'hollow-core': 5000 * spanFactor,
    'single-tee': 12000 * spanFactor,
    'solid-slab': 6000 * spanFactor,
    'wall-panel': 4000 * spanFactor,
    'stadia': 10000 * spanFactor,
  };
  
  return baseValues[memberType] || 10000 * spanFactor;
}

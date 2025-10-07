/**
 * Strand Pattern Definitions
 * 
 * Each pattern contains:
 * - Strand counts by size (3/8", 1/2", 0.6")
 * - e value: distance from bottom of plank to center of strand (inches)
 */

export interface StrandSize {
  size: '3/8' | '1/2' | '0.6';
  count: number;
  diameter: number; // inches
  area: number; // in²
}

export interface StrandPattern {
  id: string;
  name: string;
  strands: StrandSize[];
  eValue: number; // inches - distance from bottom to center of strand group
  totalArea: number; // in² - total strand area
  description?: string;
}

// Strand properties
const STRAND_PROPERTIES = {
  '3/8': { diameter: 0.375, area: 0.085 },
  '1/2': { diameter: 0.5, area: 0.153 },
  '0.6': { diameter: 0.6, area: 0.217 },
};

// Predefined strand patterns
export const STRAND_PATTERNS: StrandPattern[] = [
  {
    id: 'pattern-1',
    name: 'Pattern 1: 4×1/2"',
    strands: [
      { size: '1/2', count: 4, diameter: 0.5, area: 0.153 }
    ],
    eValue: 2.0,
    totalArea: 0.612,
    description: '4 strands of 1/2" diameter',
  },
  {
    id: 'pattern-2',
    name: 'Pattern 2: 6×1/2"',
    strands: [
      { size: '1/2', count: 6, diameter: 0.5, area: 0.153 }
    ],
    eValue: 2.5,
    totalArea: 0.918,
    description: '6 strands of 1/2" diameter',
  },
  {
    id: 'pattern-3',
    name: 'Pattern 3: 8×1/2"',
    strands: [
      { size: '1/2', count: 8, diameter: 0.5, area: 0.153 }
    ],
    eValue: 3.0,
    totalArea: 1.224,
    description: '8 strands of 1/2" diameter',
  },
  {
    id: 'pattern-4',
    name: 'Pattern 4: 10×1/2"',
    strands: [
      { size: '1/2', count: 10, diameter: 0.5, area: 0.153 }
    ],
    eValue: 3.5,
    totalArea: 1.530,
    description: '10 strands of 1/2" diameter',
  },
  {
    id: 'pattern-5',
    name: 'Pattern 5: 4×0.6"',
    strands: [
      { size: '0.6', count: 4, diameter: 0.6, area: 0.217 }
    ],
    eValue: 2.5,
    totalArea: 0.868,
    description: '4 strands of 0.6" diameter',
  },
  {
    id: 'pattern-6',
    name: 'Pattern 6: 6×0.6"',
    strands: [
      { size: '0.6', count: 6, diameter: 0.6, area: 0.217 }
    ],
    eValue: 3.0,
    totalArea: 1.302,
    description: '6 strands of 0.6" diameter',
  },
  {
    id: 'pattern-7',
    name: 'Pattern 7: Mixed 4×1/2" + 4×3/8"',
    strands: [
      { size: '1/2', count: 4, diameter: 0.5, area: 0.153 },
      { size: '3/8', count: 4, diameter: 0.375, area: 0.085 }
    ],
    eValue: 2.25,
    totalArea: 0.952,
    description: '4 strands 1/2" + 4 strands 3/8"',
  },
  {
    id: 'pattern-8',
    name: 'Pattern 8: 12×1/2"',
    strands: [
      { size: '1/2', count: 12, diameter: 0.5, area: 0.153 }
    ],
    eValue: 4.0,
    totalArea: 1.836,
    description: '12 strands of 1/2" diameter',
  },
  {
    id: 'custom',
    name: 'Custom Pattern',
    strands: [],
    eValue: 0,
    totalArea: 0,
    description: 'Define your own strand pattern',
  },
];

/**
 * Get strand pattern by ID
 */
export function getStrandPattern(patternId: string): StrandPattern | undefined {
  return STRAND_PATTERNS.find(p => p.id === patternId);
}

/**
 * Calculate total strand area
 */
export function calculateTotalStrandArea(strands: StrandSize[]): number {
  return strands.reduce((total, strand) => total + (strand.count * strand.area), 0);
}

/**
 * Create custom strand pattern
 */
export function createCustomStrandPattern(
  strands: { size: '3/8' | '1/2' | '0.6'; count: number }[],
  eValue: number
): StrandPattern {
  const strandSizes: StrandSize[] = strands.map(s => ({
    size: s.size,
    count: s.count,
    diameter: STRAND_PROPERTIES[s.size].diameter,
    area: STRAND_PROPERTIES[s.size].area,
  }));

  return {
    id: 'custom',
    name: 'Custom Pattern',
    strands: strandSizes,
    eValue,
    totalArea: calculateTotalStrandArea(strandSizes),
    description: 'Custom defined pattern',
  };
}

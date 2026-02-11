// Product Library Types

export type ProductType = 
  | 'Beams'
  | 'Hollow Core Slabs' 
  | 'Solid Slabs'
  | 'Stadia'
  | 'Columns'
  | 'Wall Panels'
  | 'Stairs';

export type DimensionUnit = 'inches' | 'feet' | 'mm' | 'cm' | 'm';

// Individual tolerance specification
export interface ToleranceSpec {
  dimension: string; // e.g., "Length", "Width", "Thickness", "Camber"
  min: string; // e.g., "-1/8", "-3mm", "0"
  max: string; // e.g., "+1/8", "+3mm", "+1/4"
  unit?: DimensionUnit;
  notes?: string;
}

// Sub-product type (e.g., 8048, 1047, 1247 under Hollow Core Slabs)
export interface SubProduct {
  id: string;
  name: string; // e.g., "8048", "1047", "1247", "1250"
  description?: string;
  tolerances: ToleranceSpec[];
  typicalDimensions?: string;
  weight?: string;
  loadCapacity?: string;

  // Cross-section properties (before strength characteristics)
  area?: number; // A - Area of concrete in cross-section (in²)
  effectiveWebWidth?: number; // Bw - Effective web width (inches)
  momentOfInertia?: number; // Ig - Moment of inertia of cross-section (in⁴)
  distanceToBottomFiber?: number; // Yb - Distance from neutral axis to extreme bottom fiber (inches)

  // Strength characteristics
  deadLoad?: string; // e.g., "65 psf", "80 psf"
  deadLoadPerLinearFoot?: number; // Auto-calculated from deadLoad (plf)
  fc28Day?: number; // f'c - 28-day concrete strength in psi (e.g., 5000, 6000)
  fciRelease?: number; // f'ci - Initial/release strength in psi (e.g., 3500, 4000)
  fpu?: number; // f'pu - Ultimate tensile strength of strand in ksi (e.g., 270)

  // Cross-section component (without strands, shows webs and cores)
  crossSectionComponent?: string; // Component name like "CrossSection8048", "CrossSection1047"

  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Product in the library
export interface Product {
  id: string;
  name: ProductType;
  description?: string;

  // Tolerances for this product type
  tolerances: ToleranceSpec[];

  // Sub-products (e.g., different slab types under Hollow Core Slabs)
  subProducts?: SubProduct[];

  // Optional specifications
  typicalDimensions?: string; // e.g., "8' to 60' length"
  weight?: string;
  loadCapacity?: string;

  // Status
  isActive: boolean;

  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

// For filtering and organizing
export interface ProductCategory {
  id: string;
  name: string;
  productTypes: ProductType[];
  description?: string;
}

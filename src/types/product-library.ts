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
  value: string; // e.g., "±1/8 inch", "±3mm", "+1/4, -0"
  unit?: DimensionUnit;
  notes?: string;
}

// Sub-product type (e.g., 8048, 1048, 1248 under Hollow Core Slabs)
export interface SubProduct {
  id: string;
  name: string; // e.g., "8048", "1048", "1248", "1250"
  description?: string;
  tolerances: ToleranceSpec[];
  typicalDimensions?: string;
  weight?: string;
  loadCapacity?: string;
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

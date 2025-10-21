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

// Product in the library
export interface Product {
  id: string;
  name: ProductType;
  description?: string;
  
  // Tolerances for this product type
  tolerances: ToleranceSpec[];
  
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

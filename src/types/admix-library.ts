export type AdmixClass = 
  | 'Water Reducer'
  | 'High-Range Water Reducer'
  | 'Air Entrainer'
  | 'Accelerator'
  | 'Retarder'
  | 'Corrosion Inhibitor'
  | 'Shrinkage Reducer'
  | 'Viscosity Modifier'
  | 'Other';

export interface AdmixLibraryItem {
  id: string;
  name: string;
  manufacturer: string;
  class: AdmixClass;
  specificGravityDisplay?: string; // User input: "1.05" or "1.05-1.08"
  specificGravity?: number; // Calculated value for use in calculations (midpoint if range)
  
  // Optional Properties
  dosageRateRecommendations?: string; // Long text from data sheets
  costPerGallon?: number;
  percentWater?: number; // %
  technicalDataSheetUrl?: string;
  safetyDataSheetUrl?: string;
  salesRepName?: string;
  salesRepPhone?: string;
  salesRepEmail?: string;
  notes?: string;
  
  // User Preferences
  isFavorite?: boolean;
  lastAccessedAt?: number;
  photoUris?: string[]; // Array of photo URIs
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface AdmixLibraryStats {
  totalAdmixes: number;
  completeAdmixes: number;
  incompleteAdmixes: number;
  byClass: Record<AdmixClass, number>;
}

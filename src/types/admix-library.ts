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
  specificGravity: number;
  
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

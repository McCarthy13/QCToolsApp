export interface AggregateLibraryItem {
  id: string;
  name: string;
  type: 'Fine' | 'Coarse';
  
  // Physical Properties
  finenessModulus?: number; // Required for Fine, N/A for Coarse
  dryRoddedUnitWeight?: number; // lb/ft³ or kg/m³
  percentVoids?: number; // %
  absorption?: number; // %
  moistureContent?: number; // %
  maxSize?: number; // inches or mm
  
  // Specific Gravity
  specificGravityBulkSSD?: number; // Bulk (Saturated Surface Dry)
  specificGravityBulkDry?: number; // Bulk (Dry)
  specificGravityApparent?: number; // Apparent
  
  // Optional Properties
  colorFamily?: 'Brown' | 'Red' | 'Black' | 'Grey' | 'White' | 'Mixed' | null;
  source?: string; // Quarry/Supplier
  stockpileNumber?: string;
  
  // Performance Properties
  laAbrasion?: number; // % - for coarse aggregates
  soundness?: number; // %
  deleteriousMaterials?: number; // %
  organicImpurities?: string; // Pass/Fail or description
  clayLumps?: number; // %
  
  // Chemical Properties
  asrReactivity?: 'Low' | 'Moderate' | 'High' | 'Not Tested' | null;
  chlorideContent?: number; // %
  sulfateContent?: number; // %
  
  // Production Data
  costPerTon?: number;
  costPerYard?: number;
  lastTestDate?: string; // ISO date string
  certifications?: string; // e.g., "ASTM C33, AASHTO M6"
  notes?: string;
  
  // User Preferences
  isFavorite?: boolean;
  lastAccessedAt?: number;
  photoUris?: string[]; // Array of photo URIs
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface AggregateLibraryStats {
  totalAggregates: number;
  fineAggregates: number;
  coarseAggregates: number;
  completeAggregates: number;
  incompleteAggregates: number;
}

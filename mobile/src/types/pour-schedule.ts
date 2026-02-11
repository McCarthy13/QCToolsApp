// Daily Pour Schedule Types

export type PourDepartment = 'Precast' | 'Extruded' | 'Wall Panels' | 'Flexicore';

export type PourStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Delayed' | 'Cancelled';

// Form/Bed definitions by department
export interface FormBed {
  id: string;
  name: string;
  department: PourDepartment;
  capacity?: string; // e.g., "60 ft", "200 sq ft"
  isActive: boolean;
  notes?: string;
}

// Individual pour entry for a form/bed
export interface PourEntry {
  id: string;
  formBedId: string;
  formBedName: string;
  department: PourDepartment;
  
  // Job details
  jobNumber: string;
  jobName?: string;
  idNumber?: string; // ID number from production schedule
  markNumbers?: string; // e.g., "M1-M5" or "M1, M3, M7"
  pieceCount?: number;
  
  // Product details
  productType?: string;
  dimensions?: string; // e.g., "8' x 4' x 6"
  
  // Mix design
  mixDesign?: string;
  concreteYards?: number;
  
  // Scheduling
  scheduledDate: number; // Date of the pour
  scheduledTime?: string; // e.g., "8:00 AM"
  status: PourStatus;
  
  // Progress tracking
  setupStartTime?: number;
  pourStartTime?: number;
  pourEndTime?: number;
  stripTime?: number;
  
  // Team
  foreman?: string;
  crew?: string[];
  
  // Notes
  notes?: string;
  issues?: string;
  
  // Metadata
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

// Daily schedule overview
export interface DailySchedule {
  id: string;
  date: number; // Date of the schedule
  department: PourDepartment;
  pourEntries: PourEntry[];
  totalYards?: number;
  shift?: 'Day' | 'Night';
  notes?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

// Department configuration with forms/beds
export interface DepartmentConfig {
  department: PourDepartment;
  forms: FormBed[];
  totalCapacity?: string;
  notes?: string;
}

// Default form/bed configurations
export const DEFAULT_FORMS: Record<PourDepartment, string[]> = {
  'Precast': ['BL1', 'BL3', 'BL4', 'BL6', 'FTE1', 'FTE2', 'FTW1', 'FTW2', 'Columns', 'STAD', 'STAIRS'],
  'Extruded': ['1', '2', '3', '4', '5', '6'],
  'Wall Panels': [], // User can add custom forms
  'Flexicore': [], // User can add custom forms
};

// Yard Location Types

import { PourDepartment } from './pour-schedule';

export interface YardLocation {
  id: string;
  name: string; // e.g., "Crane Bay 1, Row 38"
  craneBay?: string;
  row?: string;
  position?: string;
  isActive: boolean;
  notes?: string;
}

export interface YardedPiece {
  id: string;
  pourEntryId: string; // Reference to PourEntry
  yardLocationId: string; // Reference to YardLocation

  // Copied from PourEntry for quick reference
  jobNumber: string;
  jobName?: string;
  idNumber?: string;
  markNumbers?: string;
  department: PourDepartment;
  formBedName: string;
  productType?: string;
  dimensions?: string;

  // Yard tracking
  yardedDate: number; // When it was moved to yard
  yardedBy: string; // Who moved it
  pourDate: number; // When it was poured (from PourEntry)

  // Status
  isShipped: boolean;
  shippedDate?: number;
  shippedBy?: string;

  // Metadata
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface YardSearchFilters {
  department?: PourDepartment;
  jobNumber?: string;
  craneBay?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  includeShipped?: boolean;
}

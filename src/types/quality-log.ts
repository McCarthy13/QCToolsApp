// Quality Log Types for Department-Specific Logging

export type DepartmentType = 'Flexicore' | 'Wall Panels' | 'Extruded' | 'Precast';

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved' | 'Deferred' | 'Rejected';

export type IssueSeverity = 'Critical' | 'Major' | 'Minor' | 'Observation';

// Department Configuration (Admin-managed)
export interface Department {
  id: string;
  name: DepartmentType;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Issue Code Library
export interface IssueCode {
  id: string;
  code: number; // e.g., 101, 205, etc.
  title: string; // e.g., "Concrete Segregation", "Surface Defect"
  description: string;
  department?: DepartmentType; // Optional: specific to department or global
  severity: IssueSeverity;
  createdAt: number;
  updatedAt: number;
}

// Job/Piece being poured
export interface ProductionItem {
  id: string;
  jobName: string;
  jobNumber?: string;
  pieceNumber?: string;
  markNumber?: string;
  quantity?: number;
  productType?: string;
  pourDate: number; // Timestamp
  department: DepartmentType;
}

// Quality Log Entry (Main record)
export interface QualityLogEntry {
  id: string;
  department: DepartmentType;
  date: number; // Date of the log entry
  shift?: 'Day' | 'Night' | 'Weekend';
  
  // Production info
  productionItems: ProductionItem[]; // Jobs/pieces poured that day
  
  // Issues found
  issues: QualityIssue[];
  
  // Overall status/summary
  overallStatus: 'Good' | 'Issues Found' | 'Critical Issues';
  notes?: string;
  
  // Metadata
  createdBy: string; // User email
  createdAt: number;
  updatedAt: number;
  
  // Photos
  photoUris?: string[];
}

// Individual Quality Issue within a log entry
export interface QualityIssue {
  id: string;
  issueCodeId: string; // References IssueCode
  issueCode: number; // Denormalized for quick display
  issueTitle: string; // Denormalized for quick display
  issueDescription: string; // User's detailed explanation
  
  // Which production item this affects
  productionItemId?: string;
  
  // Issue details
  status: IssueStatus;
  severity: IssueSeverity;
  location?: string; // Where in the plant/piece
  
  // Resolution
  actionTaken?: string;
  resolvedBy?: string;
  resolvedAt?: number;
  
  // Photos specific to this issue
  photoUris?: string[];
  
  createdAt: number;
  updatedAt: number;
}

// Metrics/Analytics
export interface QualityMetrics {
  department: DepartmentType;
  startDate: number;
  endDate: number;
  
  totalLogs: number;
  totalIssues: number;
  issuesByStatus: Record<IssueStatus, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
  issuesByCode: Array<{ code: number; title: string; count: number }>;
  
  // Trends
  averageIssuesPerLog: number;
  criticalIssueCount: number;
  resolutionRate: number; // % of issues resolved
}

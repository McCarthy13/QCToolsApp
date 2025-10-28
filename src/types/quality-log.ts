// Quality Log Types for Department-Specific Logging

import { ProductType } from './product-library';

export type DepartmentType = 'Flexicore' | 'Wall Panels' | 'Extruded' | 'Precast';

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved' | 'Deferred' | 'Rejected';

export type IssueSeverity = 'Critical' | 'Major' | 'Minor' | 'Observation';

export type AttachmentType = 'photo' | 'document' | 'slippage' | 'note';

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
  applicableProducts: ProductType[]; // Product types this issue applies to
  createdAt: number;
  updatedAt: number;
}

// Attachment for quality log entries
export interface QualityLogAttachment {
  id: string;
  type: AttachmentType;
  title?: string;
  description?: string;
  uri?: string; // For photos/documents
  slippageData?: any; // Slippage identifier results
  createdAt: number;
}

// Extruded Department Specific Entry
export interface ExtrudedQualityEntry {
  id: string;
  jobNumber: string;
  jobName?: string; // Auto-populated from job number
  markNumber: string;
  idNumber: string;
  issueCodeId?: string;
  issueCode?: number;
  issueTitle?: string;
  issueDescription: string;
  attachments: QualityLogAttachment[];
  createdAt: number;
  updatedAt: number;
}

// Quality Log Entry (Main record)
export interface QualityLogEntry {
  id: string;
  department: DepartmentType;
  date: number; // Date of the log entry
  
  // Department-specific entries
  extrudedEntries?: ExtrudedQualityEntry[]; // For Extruded department
  // We can add more department-specific arrays as needed:
  // flexicoreEntries?: FlexicoreQualityEntry[];
  // wallPanelEntries?: WallPanelQualityEntry[];
  // precastEntries?: PrecastQualityEntry[];
  
  // Overall status/summary
  overallStatus: 'Good' | 'Issues Found' | 'Critical Issues';
  notes?: string;
  
  // Legacy support - these properties may exist in older logs
  productionItems?: ProductionItem[];
  issues?: QualityIssue[];
  
  // Metadata
  createdBy: string; // User email
  createdAt: number;
  updatedAt: number;
  
  // General attachments for the entire log
  attachments?: QualityLogAttachment[];
}

// Legacy support - keep old interface for backward compatibility
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

// Job lookup database (mock for now - could be real API later)
export interface JobLookup {
  jobNumber: string;
  jobName: string;
  customer?: string;
  location?: string;
}

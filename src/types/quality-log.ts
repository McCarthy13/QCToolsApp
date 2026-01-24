// Quality Log Types - New Table-Based System

// Product types for extruded pieces
export type ProductType = '8048' | '1047' | '1247' | '1250' | '1647' | '1648';

// Disposition options (single values)
export type Disposition = 'Scheduled' | 'Ok to Ship' | 'Eng' | 'WIP' | 'Yard Cut' | 'Not Cast' | 'Repour';

// Combined disposition type (can be single or comma-separated for Yard Cut combos)
export type DispositionValue = Disposition | string; // string allows "WIP, Yard Cut" etc.

// Status codes (auto-set based on disposition)
export type StatusCode = '40' | '50' | '90';

// Bed numbers
export type BedNumber = '1' | '2' | '3' | '4' | '5' | '6';

// Attachment types
export type AttachmentType = 'photo' | 'file' | 'slippage-report';

// Slippage data interface (used by slippage tool and PDF generator)
export interface SlippageData {
  strandId: string;
  leftSlippage: string;
  rightSlippage: string;
  leftExceedsOne: boolean;
  rightExceedsOne: boolean;
  strandSource?: 'bottom' | 'top'; // Which pattern this strand comes from
  size?: '3/8' | '1/2' | '0.6'; // Strand size from pattern
}

// Slippage config interface (used by slippage tool and PDF generator)
export interface SlippageConfig {
  projectName?: string;
  projectNumber?: string;
  markNumber?: string;
  idNumber?: string;
  span?: number;
  pourDate?: string;
  productType: string;
  strandPattern: string;
  castStrandPattern?: string;
  topStrandPattern?: string;
  topCastStrandPattern?: string;
  productWidth?: number;  // For cut-width products
  productSide?: 'L1' | 'L2';  // Which side is the product side (keeper side)
}

// Slippage data for editing (stored with slippage-report attachments)
export interface SlippageAttachmentData {
  slippages: Array<{
    strandId: string;
    leftSlippage: string;
    rightSlippage: string;
    leftExceedsOne: boolean;
    rightExceedsOne: boolean;
  }>;
  config: {
    projectName?: string;
    projectNumber?: string;
    markNumber?: string;
    idNumber?: string;
    span?: number;
    pourDate?: string;
    productType: string;
    strandPattern: string;
    castStrandPattern?: string;
    topStrandPattern?: string;
    topCastStrandPattern?: string;
    productWidth?: number;
    productSide?: 'L1' | 'L2';
  };
}

// Individual attachment item
export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
  createdAt: number;
  createdBy?: string;
  // For slippage-report type - stores the data needed to edit
  slippageData?: SlippageAttachmentData;
}

// Issue/Reject code definition
export interface QualityCode {
  id: string;
  code: string; // e.g., "1", "2", "A", etc.
  description: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Main Quality Log Entry
export interface QualityLogEntry {
  id: string;

  // Imported from PDF scan
  pourDate: string; // Format: "MM/DD/YYYY"
  productType?: ProductType;
  jobNumber: string;
  markNumber: string;
  idNumber: string; // Unique identifier
  length: string; // Format: "24'-3.75\""
  width: number; // In inches
  thickness: number; // In inches (used for product type inference)
  designStrandPattern?: string; // Design strand pattern from schedule (e.g., "117-70" or "117-70+T32-70")
  castStrandPattern?: string; // Cast strand pattern selected by user (e.g., "117-70" or "117-70+T32-70")
  bed?: BedNumber;
  location?: string; // Format: "1-80" (1-4)-(1-80)

  // Piece ticket attachment
  pieceTicketUrl?: string; // URL to the piece ticket PDF page in Firebase Storage

  // Photos associated with this piece (legacy - use attachments instead)
  photoUrls?: string[]; // Array of Firebase Storage URLs for attached photos

  // Attachments (photos, files, slippage reports)
  attachments?: Attachment[];

  // Auto-calculated based on disposition
  disposition?: DispositionValue;
  status?: StatusCode;
  approvalRejectionDate?: string; // Auto-set when disposition changes

  // Manual entry fields
  qualityComments?: string;
  engineer?: string;
  engineerFeedback?: string;
  issueCodes: string[]; // Array of code IDs
  rejectCodes: string[]; // Array of code IDs

  // Metadata
  importedAt: number;
  importedBy: string;
  updatedAt: number;
  updatedBy?: string;
}

// For tracking import batches
export interface ImportBatch {
  id: string;
  fileName: string;
  pourDate: string;
  bed?: BedNumber;
  productType?: ProductType;
  entryCount: number;
  importedAt: number;
  importedBy: string;
}

// Status/color mapping helper
export const getStatusFromDisposition = (disposition: DispositionValue): { status: StatusCode; color: string } => {
  // Handle combined dispositions (e.g., "WIP, Yard Cut")
  const dispositions = disposition.split(', ').map(d => d.trim());

  // If any disposition triggers approval/rejection (Ok to Ship, Not Cast, Repour), use that status
  if (dispositions.includes('Ok to Ship')) {
    return { status: '50', color: '#00FF00' }; // Green
  }
  if (dispositions.includes('Not Cast') || dispositions.includes('Repour')) {
    return { status: '90', color: '#FF0000' }; // Red
  }

  // Otherwise, it's a status 40 (yellow) disposition
  switch (dispositions[0] as Disposition) {
    case 'Scheduled':
    case 'Eng':
    case 'WIP':
    case 'Yard Cut':
      return { status: '40', color: '#FFFF00' }; // Yellow
    default:
      return { status: '40', color: '#FFFFFF' }; // White (no disposition)
  }
};

// Check if disposition triggers approval/rejection date
export const shouldSetApprovalDate = (disposition: DispositionValue): boolean => {
  const dispositions = disposition.split(', ').map(d => d.trim());
  return dispositions.some(d => ['Ok to Ship', 'Not Cast', 'Repour'].includes(d));
};

// Product type inference from thickness
export const inferProductTypeFromThickness = (thickness: number): ProductType | 'ambiguous' | null => {
  switch (thickness) {
    case 8:
      return '8048';
    case 10:
      return '1047';
    case 12:
      return 'ambiguous'; // Could be 1247 or 1250
    case 16:
      return 'ambiguous'; // Could be 1647 or 1648
    default:
      return null;
  }
};

// Get ambiguous product type options
export const getAmbiguousProductTypes = (thickness: number): ProductType[] => {
  switch (thickness) {
    case 12:
      return ['1247', '1250'];
    case 16:
      return ['1647', '1648'];
    default:
      return [];
  }
};

// All disposition options for dropdown
export const DISPOSITION_OPTIONS: Disposition[] = [
  'Scheduled',
  'Ok to Ship',
  'Eng',
  'WIP',
  'Yard Cut',
  'Not Cast',
  'Repour',
];

// All product type options for dropdown
export const PRODUCT_TYPE_OPTIONS: ProductType[] = [
  '8048',
  '1047',
  '1247',
  '1250',
  '1647',
  '1648',
];

// All bed options for dropdown
export const BED_OPTIONS: BedNumber[] = ['1', '2', '3', '4', '5', '6'];

// All status options (for display only - auto-set)
export const STATUS_OPTIONS: StatusCode[] = ['40', '50', '90'];

// Issue codes 1-46
export const ISSUE_CODE_OPTIONS: string[] = Array.from({ length: 46 }, (_, i) => String(i + 1));

// Reject codes 1-46
export const REJECT_CODE_OPTIONS: string[] = Array.from({ length: 46 }, (_, i) => String(i + 1));

// Location validation regex: first digit 1-4, hyphen, then 1-2 digit number 1-80
export const LOCATION_REGEX = /^[1-4]-([1-9]|[1-7][0-9]|80)$/;

// Validate location format
export const isValidLocation = (location: string): boolean => {
  return LOCATION_REGEX.test(location);
};

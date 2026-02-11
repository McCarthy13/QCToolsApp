// Quality Log Types - New Table-Based System

// Product types for extruded pieces
export type ProductType = '8048' | '1047' | '1247' | '1250' | '1647' | '1648';

// Disposition options (single values)
export type Disposition = 'Scheduled' | 'Poured' | 'Ok to Ship' | 'Eng' | 'WIP' | 'Yard Cut' | 'Not Cast' | 'Repour';

// Combined disposition type (can be single or comma-separated for Yard Cut combos)
export type DispositionValue = Disposition | string; // string allows "WIP, Yard Cut" etc.

// Status codes (auto-set based on disposition)
export type StatusCode = '40' | '50' | '90';

// Bed numbers
export type BedNumber = '1' | '2' | '3' | '4' | '5' | '6';

// Attachment types
export type AttachmentType = 'photo' | 'file' | 'slippage-report';

// Inspection Note types
export type InspectionNoteType = 'Eng' | 'WIP' | 'Note' | 'Yard Cut';

// Individual inspection note
export interface InspectionNote {
  id: string;
  type: InspectionNoteType;
  note: string;
  createdAt: number;
  createdBy?: string;
}

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
  location?: string; // Format: "X-YY" (1-9)-(1-99) or "Short"
  program?: string; // Casting program for this piece

  // Piece ticket attachment
  pieceTicketUrl?: string; // URL to the piece ticket PDF page in Firebase Storage

  // Photos associated with this piece (legacy - use attachments instead)
  photoUrls?: string[]; // Array of Firebase Storage URLs for attached photos

  // Attachments (photos, files, slippage reports)
  attachments?: Attachment[];

  // Inspection notes (multiple notes per entry, each with a type)
  inspectionNotes?: InspectionNote[];

  // Auto-calculated based on disposition
  disposition?: DispositionValue;
  status?: StatusCode;
  approvalRejectionDate?: string; // Auto-set when disposition changes to Ok to Ship, Not Cast, or Repour

  // Manual entry fields
  qualityComments?: string;
  engineer?: string;
  engineerFeedback?: string;
  issueCodes: string[]; // Array of code IDs
  rejectCodes: string[]; // Array of code IDs

  // Yard status tracking
  yardStatusUpdated?: boolean; // True when user has physically marked the piece in the yard
  hadEngDisposition?: boolean; // True once Eng disposition is ever set (triggers yard status workflow)

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

  // Scheduled and Poured have no highlight color (white/transparent)
  if (dispositions[0] === 'Scheduled' || dispositions[0] === 'Poured') {
    return { status: '40', color: '#FFFFFF' }; // White (no highlight)
  }

  // Otherwise, it's a status 40 (yellow) disposition
  switch (dispositions[0] as Disposition) {
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
  'Poured',
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

// Issue/Reject Code definitions with descriptions
export interface IssueCodeDefinition {
  code: string;
  description: string;
}

export const ISSUE_CODE_DEFINITIONS: IssueCodeDefinition[] = [
  { code: '1', description: 'Length' },
  { code: '2', description: 'Width' },
  { code: '3', description: 'Height' },
  { code: '4', description: 'Blockout Missing/Mislocated' },
  { code: '5', description: 'Embed Miscellaneous' },
  { code: '6', description: 'Embed Missing/Mislocated' },
  { code: '7', description: 'Missing Lift Loop(s)' },
  { code: '8', description: 'Wrong Strand Pattern' },
  { code: '9', description: 'Spall' },
  { code: '10', description: 'TIF Slip Strand' },
  { code: '11', description: 'BIF Slipped Strand' },
  { code: '12', description: 'Strand Location Off' },
  { code: '13', description: 'Broke While on Cart/Handling' },
  { code: '14', description: 'Found Broke in Yard' },
  { code: '15', description: 'Cumulative Core Width' },
  { code: '16', description: 'Transverse Crack' },
  { code: '17', description: 'Tearing (S Cracks in side of plank)' },
  { code: '18', description: 'Webs Cracked (formerly cores cracked)' },
  { code: '19', description: 'Crack Misc.' },
  { code: '20', description: 'Miscellaneous Aesthetic' },
  { code: '21', description: 'Poor Consolidation/Honeycomb' },
  { code: '22', description: 'Poor Consolidation in Brick Joint' },
  { code: '23', description: 'Bugholes' },
  { code: '24', description: 'Incorrect Finish' },
  { code: '25', description: 'Aggregate Contamination' },
  { code: '26', description: 'Blemishes from Form' },
  { code: '27', description: 'Tipped Brick' },
  { code: '28', description: 'Brick Misc' },
  { code: '29', description: 'Chairs Exposed' },
  { code: '30', description: 'Inconsistent Color/Finish' },
  { code: '31', description: 'Chamfer Missing/Skewed' },
  { code: '32', description: 'Reveal Missing or Mislocated' },
  { code: '33', description: 'Return Finish Missing' },
  { code: '34', description: 'Grout Joint Off Benchmarks' },
  { code: '35', description: 'Liner Seam' },
  { code: '36', description: 'Misc. Formliner' },
  { code: '37', description: 'Gaps Between Nailer/Concrete' },
  { code: '38', description: 'Inadequate Concrete Coverage' },
  { code: '39', description: 'Missing Corefill' },
  { code: '40', description: 'Miscellaneous Issues' },
  { code: '41', description: 'Drafting Error' },
  { code: '42', description: 'No Pour - Misc.' },
  { code: '43', description: 'No Pour - Batching Issues' },
  { code: '44', description: 'No Pour - Machine Issues' },
  { code: '45', description: 'No Pour - Cumulative Length' },
  { code: '46', description: 'No Pour - Piece Switched Out' },
];

// Issue codes 1-46 (just the code numbers)
export const ISSUE_CODE_OPTIONS: string[] = ISSUE_CODE_DEFINITIONS.map(ic => ic.code);

// Reject codes use the same list as issue codes
export const REJECT_CODE_OPTIONS: string[] = ISSUE_CODE_OPTIONS;

// Helper to get description for a code
export const getIssueCodeDescription = (code: string): string => {
  const found = ISSUE_CODE_DEFINITIONS.find(ic => ic.code === code);
  return found?.description || code;
};

// Location validation regex: first digit 1-9, hyphen, then 1-2 digit number 1-99
export const LOCATION_REGEX = /^[1-9]-([1-9]|[1-9][0-9])$/;

// Validate location format: X-YY where X is 1-9 and YY is 1-99, OR "Short"
export const isValidLocation = (location: string): boolean => {
  // Allow "Short" as an alternative location (case-insensitive)
  if (location.toLowerCase() === 'short') {
    return true;
  }
  return LOCATION_REGEX.test(location);
};

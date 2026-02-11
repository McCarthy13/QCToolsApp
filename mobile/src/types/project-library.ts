export interface PieceCountByType {
  productType: string;
  count: number;
}

export interface ProjectDocument {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  uploadedAt: number;
  uploadedBy: string;
}

// Document category types
export type DrawingCategory = 'pieceTickets' | 'layout' | 'embeds';
export type DocumentCategory = 'drawings' | 'projectManagement' | 'engineering';

export interface ProjectDocuments {
  // Drawings subcategories
  pieceTickets?: ProjectDocument[];
  layout?: ProjectDocument[];
  embeds?: ProjectDocument[];
  // Other main categories
  projectManagement?: ProjectDocument[];
  engineering?: ProjectDocument[];
}

// Keep Blueprint as alias for backward compatibility
export type Blueprint = ProjectDocument;

export interface Project {
  id: string;
  jobNumber: string;
  jobName: string;
  location?: string;
  salesperson?: string;
  projectManager?: string;
  assignedEngineer?: string;
  assignedDrafter?: string;
  pieceCountByType: PieceCountByType[];
  blueprints?: Blueprint[]; // Legacy field - kept for backward compatibility
  documents?: ProjectDocuments; // New organized document structure
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

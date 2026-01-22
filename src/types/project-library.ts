export interface PieceCountByType {
  productType: string;
  count: number;
}

export interface Blueprint {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  uploadedAt: number;
  uploadedBy: string;
}

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
  blueprints?: Blueprint[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

export interface PieceCountByType {
  productType: string;
  count: number;
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
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

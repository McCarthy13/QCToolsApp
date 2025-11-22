export interface ContactItem {
  id: string;
  name: string;
  company?: string;
  role?: string; // e.g., "Admix Salesperson", "Aggregate Supplier", "Testing Lab"
  phone?: string;
  email?: string;
  notes?: string;
  
  // User Preferences
  isFavorite?: boolean;
  lastAccessedAt?: number;
  photoUris?: string[]; // Array of photo URIs (e.g., business card)
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface ContactStats {
  totalContacts: number;
  completeContacts: number;
  incompleteContacts: number;
}

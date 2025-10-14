import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdmixLibraryItem } from '../types/admix-library';

interface AdmixLibraryState {
  admixes: Record<string, AdmixLibraryItem>;
  
  // CRUD operations
  addAdmix: (admix: AdmixLibraryItem) => void;
  updateAdmix: (id: string, updates: Partial<AdmixLibraryItem>) => void;
  deleteAdmix: (id: string) => void;
  getAdmix: (id: string) => AdmixLibraryItem | undefined;
  
  // Utility functions
  getAllAdmixes: () => AdmixLibraryItem[];
  searchAdmixes: (query: string) => AdmixLibraryItem[];
  isAdmixComplete: (id: string) => boolean;
}

// Helper function to check if admix has all required fields
const checkAdmixComplete = (admix: AdmixLibraryItem): boolean => {
  return !!(
    admix.name &&
    admix.manufacturer &&
    admix.class &&
    admix.specificGravity !== undefined
  );
};

export const useAdmixLibraryStore = create<AdmixLibraryState>()(
  persist(
    (set, get) => ({
      admixes: {},
      
      addAdmix: (admix) =>
        set((state) => ({
          admixes: {
            ...state.admixes,
            [admix.id]: {
              ...admix,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        })),
      
      updateAdmix: (id, updates) =>
        set((state) => {
          const existing = state.admixes[id];
          if (!existing) return state;
          
          return {
            admixes: {
              ...state.admixes,
              [id]: {
                ...existing,
                ...updates,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      
      deleteAdmix: (id) =>
        set((state) => {
          const { [id]: deleted, ...remaining } = state.admixes;
          return { admixes: remaining };
        }),
      
      getAdmix: (id) => get().admixes[id],
      
      getAllAdmixes: () => {
        const admixes = get().admixes;
        return Object.values(admixes).sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      },
      
      searchAdmixes: (query) => {
        const allAdmixes = get().getAllAdmixes();
        const lowerQuery = query.toLowerCase();
        
        return allAdmixes.filter(admix =>
          admix.name.toLowerCase().includes(lowerQuery) ||
          admix.manufacturer.toLowerCase().includes(lowerQuery) ||
          admix.class.toLowerCase().includes(lowerQuery) ||
          admix.salesRepName?.toLowerCase().includes(lowerQuery)
        );
      },
      
      isAdmixComplete: (id) => {
        const admix = get().admixes[id];
        if (!admix) return false;
        return checkAdmixComplete(admix);
      },
    }),
    {
      name: 'admix-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

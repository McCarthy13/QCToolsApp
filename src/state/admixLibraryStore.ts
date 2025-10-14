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
  
  // Favorites & Recently Used
  toggleFavorite: (id: string) => void;
  getFavorites: () => AdmixLibraryItem[];
  trackAccess: (id: string) => void;
  getRecentlyUsed: (limit?: number) => AdmixLibraryItem[];
  
  // Duplicate
  duplicateAdmix: (id: string) => AdmixLibraryItem | undefined;
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
      
      toggleFavorite: (id) =>
        set((state) => {
          const existing = state.admixes[id];
          if (!existing) return state;
          
          return {
            admixes: {
              ...state.admixes,
              [id]: {
                ...existing,
                isFavorite: !existing.isFavorite,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      
      getFavorites: () => {
        const allAdmixes = get().getAllAdmixes();
        return allAdmixes.filter(admix => admix.isFavorite);
      },
      
      trackAccess: (id) =>
        set((state) => {
          const existing = state.admixes[id];
          if (!existing) return state;
          
          return {
            admixes: {
              ...state.admixes,
              [id]: {
                ...existing,
                lastAccessedAt: Date.now(),
              },
            },
          };
        }),
      
      getRecentlyUsed: (limit = 5) => {
        const allAdmixes = get().getAllAdmixes();
        return allAdmixes
          .filter(admix => admix.lastAccessedAt)
          .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
          .slice(0, limit);
      },
      
      duplicateAdmix: (id) => {
        const existing = get().admixes[id];
        if (!existing) return undefined;
        
        const newAdmix: AdmixLibraryItem = {
          ...existing,
          id: Date.now().toString(),
          name: `${existing.name} (Copy)`,
          isFavorite: false,
          lastAccessedAt: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        get().addAdmix(newAdmix);
        return newAdmix;
      },
    }),
    {
      name: 'admix-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

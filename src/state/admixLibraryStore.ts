import { create } from 'zustand';
import { FirebaseSync } from '../services/firebaseSync';
import { AdmixLibraryItem } from '../types/admix-library';

interface AdmixLibraryState {
  admixes: Record<string, AdmixLibraryItem>;
  loading: boolean;
  initialized: boolean;

  // CRUD operations
  addAdmix: (admix: AdmixLibraryItem) => Promise<void>;
  updateAdmix: (id: string, updates: Partial<AdmixLibraryItem>) => Promise<void>;
  deleteAdmix: (id: string) => Promise<void>;
  getAdmix: (id: string) => AdmixLibraryItem | undefined;

  // Utility functions
  getAllAdmixes: () => AdmixLibraryItem[];
  searchAdmixes: (query: string) => AdmixLibraryItem[];
  isAdmixComplete: (id: string) => boolean;

  // Favorites & Recently Used
  toggleFavorite: (id: string) => Promise<void>;
  getFavorites: () => AdmixLibraryItem[];
  trackAccess: (id: string) => Promise<void>;
  getRecentlyUsed: (limit?: number) => AdmixLibraryItem[];

  // Duplicate
  duplicateAdmix: (id: string) => Promise<AdmixLibraryItem | undefined>;

  // Initialize
  initialize: () => Promise<void>;
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

const firebaseSync = new FirebaseSync<AdmixLibraryItem>('admixLibrary');

export const useAdmixLibraryStore = create<AdmixLibraryState>()((set, get) => ({
  admixes: {},
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    try {
      const items = await firebaseSync.fetchAll();
      const admixes = items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, AdmixLibraryItem>);

      set({ admixes, loading: false, initialized: true });

      firebaseSync.subscribe((updatedItems) => {
        const updatedAdmixes = updatedItems.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {} as Record<string, AdmixLibraryItem>);
        set({ admixes: updatedAdmixes });
      });
    } catch (error) {
      console.error('Failed to initialize admixes:', error);
      set({ loading: false, initialized: true });
    }
  },

  addAdmix: async (admix) => {
    const newAdmix = {
      ...admix,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      admixes: {
        ...state.admixes,
        [admix.id]: newAdmix,
      },
    }));

    try {
      await firebaseSync.set(admix.id, newAdmix);
    } catch (error) {
      set((state) => {
        const { [admix.id]: deleted, ...remaining } = state.admixes;
        return { admixes: remaining };
      });
      throw error;
    }
  },

  updateAdmix: async (id, updates) => {
    const existing = get().admixes[id];
    if (!existing) return;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    set((state) => ({
      admixes: {
        ...state.admixes,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      set((state) => ({
        admixes: {
          ...state.admixes,
          [id]: existing,
        },
      }));
      throw error;
    }
  },

  deleteAdmix: async (id) => {
    const existing = get().admixes[id];

    set((state) => {
      const { [id]: deleted, ...remaining } = state.admixes;
      return { admixes: remaining };
    });

    try {
      await firebaseSync.delete(id);
    } catch (error) {
      if (existing) {
        set((state) => ({
          admixes: {
            ...state.admixes,
            [id]: existing,
          },
        }));
      }
      throw error;
    }
  },

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

  toggleFavorite: async (id) => {
    const existing = get().admixes[id];
    if (!existing) return;

    const updated = {
      ...existing,
      isFavorite: !existing.isFavorite,
      updatedAt: Date.now(),
    };

    set((state) => ({
      admixes: {
        ...state.admixes,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      set((state) => ({
        admixes: {
          ...state.admixes,
          [id]: existing,
        },
      }));
      throw error;
    }
  },

  getFavorites: () => {
    const allAdmixes = get().getAllAdmixes();
    return allAdmixes.filter(admix => admix.isFavorite);
  },

  trackAccess: async (id) => {
    const existing = get().admixes[id];
    if (!existing) return;

    const updated = {
      ...existing,
      lastAccessedAt: Date.now(),
    };

    set((state) => ({
      admixes: {
        ...state.admixes,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      console.error('Failed to track access:', error);
    }
  },

  getRecentlyUsed: (limit = 5) => {
    const allAdmixes = get().getAllAdmixes();
    return allAdmixes
      .filter(admix => admix.lastAccessedAt)
      .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
      .slice(0, limit);
  },

  duplicateAdmix: async (id) => {
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

    await get().addAdmix(newAdmix);
    return newAdmix;
  },
}));

import { create } from 'zustand';
import { FirebaseSync } from '../services/firebaseSync';
import { AggregateLibraryItem } from '../types/aggregate-library';

interface AggregateLibraryState {
  aggregates: Record<string, AggregateLibraryItem>;
  loading: boolean;
  initialized: boolean;

  // CRUD operations
  addAggregate: (aggregate: AggregateLibraryItem) => Promise<void>;
  updateAggregate: (id: string, updates: Partial<AggregateLibraryItem>) => Promise<void>;
  deleteAggregate: (id: string) => Promise<void>;
  getAggregate: (id: string) => AggregateLibraryItem | undefined;

  // Utility functions
  getAllAggregates: () => AggregateLibraryItem[];
  searchAggregates: (query: string) => AggregateLibraryItem[];
  isAggregateComplete: (id: string) => boolean;

  // Favorites & Recently Used
  toggleFavorite: (id: string) => Promise<void>;
  getFavorites: () => AggregateLibraryItem[];
  trackAccess: (id: string) => Promise<void>;
  getRecentlyUsed: (limit?: number) => AggregateLibraryItem[];

  // Duplicate
  duplicateAggregate: (id: string) => Promise<AggregateLibraryItem | undefined>;

  // Initialize
  initialize: () => Promise<void>;
}

// Helper function to check if aggregate has all required fields
const checkAggregateComplete = (aggregate: AggregateLibraryItem): boolean => {
  const hasBasicInfo = !!(
    aggregate.name &&
    aggregate.type &&
    aggregate.dryRoddedUnitWeight !== undefined &&
    aggregate.percentVoids !== undefined &&
    aggregate.absorption !== undefined &&
    aggregate.specificGravityBulkSSD !== undefined &&
    aggregate.specificGravityBulkDry !== undefined &&
    aggregate.specificGravityApparent !== undefined
  );

  if (aggregate.type === 'Fine') {
    return hasBasicInfo && aggregate.finenessModulus !== undefined;
  }

  return hasBasicInfo;
};

const firebaseSync = new FirebaseSync<AggregateLibraryItem>('aggregateLibrary');

export const useAggregateLibraryStore = create<AggregateLibraryState>()((set, get) => ({
  aggregates: {},
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    try {
      const items = await firebaseSync.fetchAll();
      const aggregates = items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, AggregateLibraryItem>);

      set({ aggregates, loading: false, initialized: true });

      // Subscribe to real-time updates
      firebaseSync.subscribe((updatedItems) => {
        const updatedAggregates = updatedItems.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {} as Record<string, AggregateLibraryItem>);
        set({ aggregates: updatedAggregates });
      });
    } catch (error) {
      console.error('Failed to initialize aggregates:', error);
      set({ loading: false, initialized: true });
    }
  },

  addAggregate: async (aggregate) => {
    const newAggregate = {
      ...aggregate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      aggregates: {
        ...state.aggregates,
        [aggregate.id]: newAggregate,
      },
    }));

    try {
      await firebaseSync.set(aggregate.id, newAggregate);
    } catch (error) {
      // Revert on error
      set((state) => {
        const { [aggregate.id]: deleted, ...remaining } = state.aggregates;
        return { aggregates: remaining };
      });
      throw error;
    }
  },

  updateAggregate: async (id, updates) => {
    const existing = get().aggregates[id];
    if (!existing) return;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      aggregates: {
        ...state.aggregates,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      // Revert on error
      set((state) => ({
        aggregates: {
          ...state.aggregates,
          [id]: existing,
        },
      }));
      throw error;
    }
  },

  deleteAggregate: async (id) => {
    const existing = get().aggregates[id];

    // Optimistically update UI
    set((state) => {
      const { [id]: deleted, ...remaining } = state.aggregates;
      return { aggregates: remaining };
    });

    try {
      await firebaseSync.delete(id);
    } catch (error) {
      // Revert on error
      if (existing) {
        set((state) => ({
          aggregates: {
            ...state.aggregates,
            [id]: existing,
          },
        }));
      }
      throw error;
    }
  },

  getAggregate: (id) => get().aggregates[id],

  getAllAggregates: () => {
    const aggregates = get().aggregates;
    return Object.values(aggregates).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },

  searchAggregates: (query) => {
    const allAggregates = get().getAllAggregates();
    const lowerQuery = query.toLowerCase();

    return allAggregates.filter(agg =>
      agg.name.toLowerCase().includes(lowerQuery) ||
      agg.source?.toLowerCase().includes(lowerQuery) ||
      agg.stockpileNumber?.toLowerCase().includes(lowerQuery) ||
      agg.colorFamily?.toLowerCase().includes(lowerQuery)
    );
  },

  isAggregateComplete: (id) => {
    const aggregate = get().aggregates[id];
    if (!aggregate) return false;
    return checkAggregateComplete(aggregate);
  },

  toggleFavorite: async (id) => {
    const existing = get().aggregates[id];
    if (!existing) return;

    const updated = {
      ...existing,
      isFavorite: !existing.isFavorite,
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      aggregates: {
        ...state.aggregates,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      // Revert on error
      set((state) => ({
        aggregates: {
          ...state.aggregates,
          [id]: existing,
        },
      }));
      throw error;
    }
  },

  getFavorites: () => {
    const allAggregates = get().getAllAggregates();
    return allAggregates.filter(agg => agg.isFavorite);
  },

  trackAccess: async (id) => {
    const existing = get().aggregates[id];
    if (!existing) return;

    const updated = {
      ...existing,
      lastAccessedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      aggregates: {
        ...state.aggregates,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      // Revert on error - but this is less critical
      console.error('Failed to track access:', error);
    }
  },

  getRecentlyUsed: (limit = 5) => {
    const allAggregates = get().getAllAggregates();
    return allAggregates
      .filter(agg => agg.lastAccessedAt)
      .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
      .slice(0, limit);
  },

  duplicateAggregate: async (id) => {
    const existing = get().aggregates[id];
    if (!existing) return undefined;

    const newAggregate: AggregateLibraryItem = {
      ...existing,
      id: Date.now().toString(),
      name: `${existing.name} (Copy)`,
      isFavorite: false,
      lastAccessedAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await get().addAggregate(newAggregate);
    return newAggregate;
  },
}));

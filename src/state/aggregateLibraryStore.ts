import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AggregateLibraryItem } from '../types/aggregate-library';

interface AggregateLibraryState {
  aggregates: Record<string, AggregateLibraryItem>;
  
  // CRUD operations
  addAggregate: (aggregate: AggregateLibraryItem) => void;
  updateAggregate: (id: string, updates: Partial<AggregateLibraryItem>) => void;
  deleteAggregate: (id: string) => void;
  getAggregate: (id: string) => AggregateLibraryItem | undefined;
  
  // Utility functions
  getAllAggregates: () => AggregateLibraryItem[];
  searchAggregates: (query: string) => AggregateLibraryItem[];
  isAggregateComplete: (id: string) => boolean;
}

// Helper function to check if aggregate has all required fields
const checkAggregateComplete = (aggregate: AggregateLibraryItem): boolean => {
  // Required for all
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
  
  // Fine aggregates require FM
  if (aggregate.type === 'Fine') {
    return hasBasicInfo && aggregate.finenessModulus !== undefined;
  }
  
  return hasBasicInfo;
};

export const useAggregateLibraryStore = create<AggregateLibraryState>()(
  persist(
    (set, get) => ({
      aggregates: {},
      
      addAggregate: (aggregate) =>
        set((state) => ({
          aggregates: {
            ...state.aggregates,
            [aggregate.id]: {
              ...aggregate,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        })),
      
      updateAggregate: (id, updates) =>
        set((state) => {
          const existing = state.aggregates[id];
          if (!existing) return state;
          
          return {
            aggregates: {
              ...state.aggregates,
              [id]: {
                ...existing,
                ...updates,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      
      deleteAggregate: (id) =>
        set((state) => {
          const { [id]: deleted, ...remaining } = state.aggregates;
          return { aggregates: remaining };
        }),
      
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
    }),
    {
      name: 'aggregate-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

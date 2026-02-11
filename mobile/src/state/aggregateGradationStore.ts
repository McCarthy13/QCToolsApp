import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AggregateConfig, TestRecord } from '../types/aggregate-gradation';
import { DEFAULT_AGGREGATES } from '../utils/aggregate-gradation-constants';

interface AggregateGradationState {
  // Data
  aggregates: Record<string, AggregateConfig>;
  testHistory: TestRecord[];
  defaultAggregates: string[];
  
  // Aggregate management actions
  addAggregate: (name: string, config: AggregateConfig) => void;
  updateAggregate: (name: string, config: AggregateConfig) => void;
  deleteAggregate: (name: string) => void;
  
  // Test management actions
  addTest: (test: TestRecord) => void;
  updateTest: (id: string, updates: Partial<TestRecord>) => void;
  deleteTest: (id: string) => void;
  clearAllTests: () => void;
  
  // Default aggregates management
  setDefaultAggregates: (names: string[]) => void;
  
  // Utility actions
  getAggregate: (name: string) => AggregateConfig | undefined;
  getTest: (id: string) => TestRecord | undefined;
}

export const useAggregateGradationStore = create<AggregateGradationState>()(
  persist(
    (set, get) => ({
      // Initial state
      aggregates: DEFAULT_AGGREGATES,
      testHistory: [],
      defaultAggregates: ['Concrete Sand', 'Keystone #7'],
      
      // Aggregate management
      addAggregate: (name, config) =>
        set((state) => ({
          aggregates: { ...state.aggregates, [name]: config },
        })),
      
      updateAggregate: (name, config) =>
        set((state) => ({
          aggregates: { ...state.aggregates, [name]: config },
        })),
      
      deleteAggregate: (name) =>
        set((state) => {
          const { [name]: deleted, ...remaining } = state.aggregates;
          return {
            aggregates: remaining,
            defaultAggregates: state.defaultAggregates.filter(n => n !== name),
          };
        }),
      
      // Test management
      addTest: (test) =>
        set((state) => ({
          testHistory: [test, ...state.testHistory].slice(0, 100), // Keep last 100 tests
        })),
      
      updateTest: (id, updates) =>
        set((state) => ({
          testHistory: state.testHistory.map((test) =>
            test.id === id ? { ...test, ...updates } : test
          ),
        })),
      
      deleteTest: (id) =>
        set((state) => ({
          testHistory: state.testHistory.filter((test) => test.id !== id),
        })),
      
      clearAllTests: () => set({ testHistory: [] }),
      
      // Default aggregates
      setDefaultAggregates: (names) =>
        set({ defaultAggregates: names.slice(0, 8) }), // Max 8 defaults
      
      // Utilities
      getAggregate: (name) => get().aggregates[name],
      getTest: (id) => get().testHistory.find((test) => test.id === id),
    }),
    {
      name: 'aggregate-gradation-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StrandCoordinate {
  x: number; // Horizontal distance from left edge (inches)
  y: number; // Vertical distance from bottom (inches)
}

export interface CustomStrandPattern {
  id: string;
  patternId: string; // Format: "101-75" (pattern number - pulling force %)
  name: string;
  position: 'Top' | 'Bottom' | 'Both'; // Where strands are positioned
  strand_3_8: number; // Count of 3/8" strands
  strand_1_2: number; // Count of 1/2" strands
  strand_0_6: number; // Count of 0.6" strands
  strandSizes?: Array<'3/8' | '1/2' | '0.6'>; // Size of each strand by position (left to right)
  strandCoordinates?: StrandCoordinate[]; // (x,y) position of each strand from bottom-left corner
  eValue: number; // Distance from bottom to center of strand (inches)
  pullingForce: number; // Percentage of break strength (1-99%)
  totalArea: number; // Total strand area in in²
  // Legacy fields - kept for backward compatibility with old patterns
  momentOfInertia?: number; // Deprecated: Should come from product, not strand pattern
  deadLoad?: number; // Deprecated: Should come from product, not strand pattern
}

interface StrandPatternState {
  customPatterns: CustomStrandPattern[];
  addPattern: (pattern: Omit<CustomStrandPattern, 'id'>) => void;
  updatePattern: (id: string, pattern: Omit<CustomStrandPattern, 'id'>) => void;
  removePattern: (id: string) => void;
  clearAllPatterns: () => void;
  getPatternById: (id: string) => CustomStrandPattern | undefined;
  getPatternByPatternId: (patternId: string) => CustomStrandPattern | undefined;
  getPatternsByPosition: (position: 'Top' | 'Bottom' | 'Both') => CustomStrandPattern[];
}

export const useStrandPatternStore = create<StrandPatternState>()(
  persist(
    (set, get) => ({
      customPatterns: [],
      
      addPattern: (pattern) =>
        set((state) => ({
          customPatterns: [
            ...state.customPatterns,
            {
              ...pattern,
              id: Date.now().toString(),
            },
          ],
        })),
      
      updatePattern: (id, pattern) =>
        set((state) => ({
          customPatterns: state.customPatterns.map((p) =>
            p.id === id ? { ...pattern, id } : p
          ),
        })),
      
      removePattern: (id) =>
        set((state) => ({
          customPatterns: state.customPatterns.filter((p) => p.id !== id),
        })),
      
      clearAllPatterns: () =>
        set(() => ({
          customPatterns: [],
        })),
      
      getPatternById: (id) => {
        return get().customPatterns.find((p) => p.id === id);
      },
      
      getPatternByPatternId: (patternId) => {
        return get().customPatterns.find((p) => p.patternId === patternId);
      },
      
      getPatternsByPosition: (position) => {
        return get().customPatterns.filter((p) => 
          p.position === position || p.position === 'Both'
        );
      },
    }),
    {
      name: 'strand-pattern-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

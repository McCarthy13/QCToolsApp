import { create } from 'zustand';
import { FirebaseSync } from '../services/firebaseSync';

export interface StrandCoordinate {
  x: number; // Horizontal distance from left edge (inches)
  y: number; // Vertical distance from bottom (inches)
}

export interface CustomStrandPattern {
  id: string;
  patternId: string; // Format: "101-75" (pattern number - pulling force %)
  name: string;
  department: 'Wall Panels' | 'Extruded' | 'Flexicore' | 'Precast'; // Department category
  productType: '8048' | '1048' | '1247' | '1250' | '1648' | string; // Product type within department
  position: 'Top' | 'Bottom' | 'Both'; // Where strands are positioned
  strand_3_8: number; // Count of 3/8" strands
  strand_1_2: number; // Count of 1/2" strands
  strand_0_6: number; // Count of 0.6" strands
  strandSizes?: Array<'3/8' | '1/2' | '0.6'>; // Size of each strand by position (left to right)
  strandCoordinates?: StrandCoordinate[]; // (x,y) position of each strand from bottom-left corner
  eValue: number; // Distance from bottom to center of strand (inches)
  pullingForce: number; // Percentage of break strength (1-99%)
  requiredForce?: number; // Required force in pounds (lbs) for this strand pattern
  totalArea: number; // Total strand area in in²
  // Legacy fields - kept for backward compatibility with old patterns
  momentOfInertia?: number; // Deprecated: Should come from product, not strand pattern
  deadLoad?: number; // Deprecated: Should come from product, not strand pattern
}

interface StrandPatternState {
  customPatterns: CustomStrandPattern[];
  loading: boolean;
  initialized: boolean;
  addPattern: (pattern: Omit<CustomStrandPattern, 'id'>) => Promise<void>;
  updatePattern: (id: string, pattern: Omit<CustomStrandPattern, 'id'>) => Promise<void>;
  removePattern: (id: string) => Promise<void>;
  clearAllPatterns: () => Promise<void>;
  getPatternById: (id: string) => CustomStrandPattern | undefined;
  getPatternByPatternId: (patternId: string) => CustomStrandPattern | undefined;
  getPatternsByPosition: (position: 'Top' | 'Bottom' | 'Both') => CustomStrandPattern[];
  initialize: () => Promise<void>;
}

const firebaseSync = new FirebaseSync<CustomStrandPattern>('strandPatterns');

export const useStrandPatternStore = create<StrandPatternState>()((set, get) => ({
  customPatterns: [],
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    try {
      const patterns = await firebaseSync.fetchAll();
      set({ customPatterns: patterns, loading: false, initialized: true });

      // Subscribe to real-time updates
      firebaseSync.subscribe((updatedPatterns) => {
        set({ customPatterns: updatedPatterns });
      });
    } catch (error) {
      console.error('Failed to initialize strand patterns:', error);
      set({ loading: false, initialized: true });
    }
  },

  addPattern: async (pattern) => {
    const id = Date.now().toString();
    const newPattern: CustomStrandPattern = {
      ...pattern,
      id,
    };

    // Optimistically update UI
    set((state) => ({
      customPatterns: [...state.customPatterns, newPattern],
    }));

    try {
      await firebaseSync.set(id, newPattern);
    } catch (error) {
      // Revert on error
      set((state) => ({
        customPatterns: state.customPatterns.filter((p) => p.id !== id),
      }));
      throw error;
    }
  },

  updatePattern: async (id, pattern) => {
    const oldPattern = get().customPatterns.find((p) => p.id === id);

    // Optimistically update UI
    set((state) => ({
      customPatterns: state.customPatterns.map((p) =>
        p.id === id ? { ...pattern, id } : p
      ),
    }));

    try {
      await firebaseSync.set(id, { ...pattern, id });
    } catch (error) {
      // Revert on error
      if (oldPattern) {
        set((state) => ({
          customPatterns: state.customPatterns.map((p) => (p.id === id ? oldPattern : p)),
        }));
      }
      throw error;
    }
  },

  removePattern: async (id) => {
    const oldPattern = get().customPatterns.find((p) => p.id === id);

    // Optimistically update UI
    set((state) => ({
      customPatterns: state.customPatterns.filter((p) => p.id !== id),
    }));

    try {
      await firebaseSync.delete(id);
    } catch (error) {
      // Revert on error
      if (oldPattern) {
        set((state) => ({
          customPatterns: [...state.customPatterns, oldPattern],
        }));
      }
      throw error;
    }
  },

  clearAllPatterns: async () => {
    const oldPatterns = get().customPatterns;

    // Optimistically update UI
    set(() => ({
      customPatterns: [],
    }));

    try {
      // Delete all patterns from Firebase
      await Promise.all(oldPatterns.map(p => firebaseSync.delete(p.id)));
    } catch (error) {
      // Revert on error
      set(() => ({
        customPatterns: oldPatterns,
      }));
      throw error;
    }
  },

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
}));

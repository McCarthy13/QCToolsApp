import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StrandDefinition {
  id: string;
  name: string; // e.g., "1/2\" Grade 270"
  diameter: number; // inches (e.g., 0.5)
  area: number; // square inches
  elasticModulus: number; // ksi (1000 psi)
  breakingStrength: number; // kips (1000 lbs)
  grade?: string; // e.g., "270", "250"
  isDefault?: boolean; // True for built-in strands
  createdAt: number; // timestamp
}

interface StrandLibraryState {
  strands: StrandDefinition[];
  addStrand: (strand: Omit<StrandDefinition, 'id' | 'createdAt'>) => void;
  updateStrand: (id: string, strand: Omit<StrandDefinition, 'id' | 'createdAt'>) => void;
  removeStrand: (id: string) => void;
  getStrandById: (id: string) => StrandDefinition | undefined;
  getStrandsByDiameter: (diameter: number) => StrandDefinition[];
  seedDefaultStrands: () => void;
}

// Default strand definitions based on ASTM A416
const DEFAULT_STRANDS: Omit<StrandDefinition, 'id' | 'createdAt'>[] = [
  // Grade 250 strands
  {
    name: "3/8\" Grade 250",
    diameter: 0.375,
    area: 0.080,
    elasticModulus: 28500,
    breakingStrength: 20.0,
    grade: "250",
    isDefault: true,
  },
  {
    name: "7/16\" Grade 250",
    diameter: 0.4375,
    area: 0.115,
    elasticModulus: 28500,
    breakingStrength: 29.0,
    grade: "250",
    isDefault: true,
  },
  {
    name: "1/2\" Grade 250",
    diameter: 0.500,
    area: 0.153,
    elasticModulus: 28500,
    breakingStrength: 38.3,
    grade: "250",
    isDefault: true,
  },
  {
    name: "0.6\" Grade 250",
    diameter: 0.600,
    area: 0.217,
    elasticModulus: 28500,
    breakingStrength: 54.0,
    grade: "250",
    isDefault: true,
  },
  // Grade 270 strands
  {
    name: "3/8\" Grade 270",
    diameter: 0.375,
    area: 0.080,
    elasticModulus: 28500,
    breakingStrength: 23.0,
    grade: "270",
    isDefault: true,
  },
  {
    name: "7/16\" Grade 270",
    diameter: 0.4375,
    area: 0.115,
    elasticModulus: 28500,
    breakingStrength: 31.0,
    grade: "270",
    isDefault: true,
  },
  {
    name: "1/2\" Grade 270",
    diameter: 0.500,
    area: 0.153,
    elasticModulus: 28500,
    breakingStrength: 41.3,
    grade: "270",
    isDefault: true,
  },
  {
    name: "0.6\" Grade 270",
    diameter: 0.600,
    area: 0.217,
    elasticModulus: 28500,
    breakingStrength: 58.6,
    grade: "270",
    isDefault: true,
  },
];

export const useStrandLibraryStore = create<StrandLibraryState>()(
  persist(
    (set, get) => ({
      strands: [],

      addStrand: (strand) =>
        set((state) => ({
          strands: [
            ...state.strands,
            {
              ...strand,
              id: `strand-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              createdAt: Date.now(),
            },
          ],
        })),

      updateStrand: (id, strand) =>
        set((state) => ({
          strands: state.strands.map((s) =>
            s.id === id ? { ...s, ...strand } : s
          ),
        })),

      removeStrand: (id) =>
        set((state) => ({
          strands: state.strands.filter((s) => s.id !== id),
        })),

      getStrandById: (id) => {
        return get().strands.find((s) => s.id === id);
      },

      getStrandsByDiameter: (diameter) => {
        return get().strands.filter((s) => Math.abs(s.diameter - diameter) < 0.001);
      },

      seedDefaultStrands: () => {
        const state = get();
        
        // Check if we need to add Grade 250 strands (migration)
        const hasGrade250 = state.strands.some(s => s.grade === "250");
        
        if (state.strands.length === 0) {
          // Fresh install - add all default strands
          DEFAULT_STRANDS.forEach((strand) => {
            state.addStrand(strand);
          });
        } else if (!hasGrade250) {
          // Existing installation without Grade 250 - add only Grade 250 strands
          const grade250Strands = DEFAULT_STRANDS.filter(s => s.grade === "250");
          grade250Strands.forEach((strand) => {
            state.addStrand(strand);
          });
        }
      },
    }),
    {
      name: 'strand-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Always check and seed/migrate strands
        if (state) {
          state.seedDefaultStrands();
        }
      },
    }
  )
);

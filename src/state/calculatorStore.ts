import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CamberInputs, CamberResult } from '../utils/camber-calculations';

export interface CalculationRecord {
  id: string;
  timestamp: number;
  inputs: CamberInputs;
  results: CamberResult;
  projectName?: string;
}

interface CalculatorState {
  history: CalculationRecord[];
  currentInputs: Partial<CamberInputs>;
  addCalculation: (record: CalculationRecord) => void;
  removeCalculation: (id: string) => void;
  clearHistory: () => void;
  updateCurrentInputs: (inputs: Partial<CamberInputs>) => void;
  resetCurrentInputs: () => void;
}

const defaultInputs: Partial<CamberInputs> = {
  memberType: 'double-tee',
  releaseStrength: 3500,
  concreteStrength: 5000,
  calculationMethod: 'pci',
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      history: [],
      currentInputs: defaultInputs,
      
      addCalculation: (record) =>
        set((state) => ({
          history: [record, ...state.history].slice(0, 50), // Keep last 50 calculations
        })),
      
      removeCalculation: (id) =>
        set((state) => ({
          history: state.history.filter((calc) => calc.id !== id),
        })),
      
      clearHistory: () => set({ history: [] }),
      
      updateCurrentInputs: (inputs) =>
        set((state) => ({
          currentInputs: { ...state.currentInputs, ...inputs },
        })),
      
      resetCurrentInputs: () => set({ currentInputs: defaultInputs }),
    }),
    {
      name: 'camber-calculator-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ history: state.history }), // Only persist history
    }
  )
);

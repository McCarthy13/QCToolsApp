import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SlippageData {
  strandId: string;
  leftSlippage: string;
  rightSlippage: string;
  leftExceedsOne: boolean;
  rightExceedsOne: boolean;
}

export interface SlippageConfig {
  projectName?: string;
  projectNumber?: string;
  markNumber?: string;
  idNumber?: string;
  span?: number;
  productType: string;
  strandPattern: string;
  topStrandPattern?: string;
  productWidth?: number;  // For cut-width products
  productSide?: 'L1' | 'L2';  // Which side is the product side (keeper side)
}

export interface SlippageRecord {
  id: string;
  timestamp: number;
  slippages: SlippageData[];
  config: SlippageConfig;
  createdBy: string; // Username of the person who created it
}

export interface PublishedSlippageRecord extends SlippageRecord {
  publishedAt: number;
  publishedBy: string; // Username of the person who published it
}

interface SlippageHistoryState {
  userRecords: SlippageRecord[];
  publishedRecords: PublishedSlippageRecord[];
  
  // User records actions
  addUserRecord: (record: SlippageRecord) => void;
  updateUserRecord: (id: string, updates: Partial<SlippageRecord>) => void;
  removeUserRecord: (id: string) => void;
  clearUserRecords: () => void;
  
  // Published records actions
  publishRecord: (record: SlippageRecord, publishedBy: string) => void;
  removePublishedRecord: (id: string) => void;
  clearPublishedRecords: () => void;
}

export const useSlippageHistoryStore = create<SlippageHistoryState>()(
  persist(
    (set) => ({
      userRecords: [],
      publishedRecords: [],
      
      addUserRecord: (record) =>
        set((state) => ({
          userRecords: [record, ...state.userRecords].slice(0, 100), // Keep last 100 records
        })),
      
      updateUserRecord: (id, updates) =>
        set((state) => ({
          userRecords: state.userRecords.map((record) =>
            record.id === id ? { ...record, ...updates } : record
          ),
        })),
      
      removeUserRecord: (id) =>
        set((state) => ({
          userRecords: state.userRecords.filter((record) => record.id !== id),
        })),
      
      clearUserRecords: () => set({ userRecords: [] }),
      
      publishRecord: (record, publishedBy) =>
        set((state) => {
          const publishedRecord: PublishedSlippageRecord = {
            ...record,
            publishedAt: Date.now(),
            publishedBy,
          };
          return {
            publishedRecords: [publishedRecord, ...state.publishedRecords].slice(0, 200), // Keep last 200 published
          };
        }),
      
      removePublishedRecord: (id) =>
        set((state) => ({
          publishedRecords: state.publishedRecords.filter((record) => record.id !== id),
        })),
      
      clearPublishedRecords: () => set({ publishedRecords: [] }),
    }),
    {
      name: 'slippage-history-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

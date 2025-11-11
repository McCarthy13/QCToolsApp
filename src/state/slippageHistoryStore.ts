import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseSync } from '../services/firebaseSync';
import { useAuthStore } from './authStore';

export interface SlippageData {
  strandId: string;
  leftSlippage: string;
  rightSlippage: string;
  leftExceedsOne: boolean;
  rightExceedsOne: boolean;
  strandSource?: 'bottom' | 'top'; // Which pattern this strand comes from
  size?: '3/8' | '1/2' | '0.6'; // Strand size from pattern
}

export interface SlippageConfig {
  projectName?: string;
  projectNumber?: string;
  markNumber?: string;
  idNumber?: string;
  span?: number;
  pourDate?: string;
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
  userId: string; // Firebase user ID for filtering
}

export interface PublishedSlippageRecord extends SlippageRecord {
  publishedAt: number;
  publishedBy: string; // Username of the person who published it
}

interface SlippageHistoryState {
  userRecords: SlippageRecord[];
  publishedRecords: PublishedSlippageRecord[];
  isLoading: boolean;
  isSyncing: boolean;

  // User records actions
  addUserRecord: (record: SlippageRecord) => Promise<void>;
  updateUserRecord: (id: string, updates: Partial<SlippageRecord>) => void;
  removeUserRecord: (id: string) => Promise<void>;
  clearUserRecords: () => void;

  // Published records actions
  publishRecord: (record: SlippageRecord, publishedBy: string) => Promise<void>;
  removePublishedRecord: (id: string) => Promise<void>;
  clearPublishedRecords: () => void;

  // Firebase sync actions
  syncUserRecords: () => Promise<void>;
  syncPublishedRecords: () => Promise<void>;
  subscribeToPublishedRecords: () => () => void;
}

// Firebase sync instances
const userRecordsSync = new FirebaseSync<SlippageRecord>('userSlippageRecords');
const publishedRecordsSync = new FirebaseSync<PublishedSlippageRecord>('publishedSlippageRecords');

export const useSlippageHistoryStore = create<SlippageHistoryState>()(
  persist(
    (set, get) => ({
      userRecords: [],
      publishedRecords: [],
      isLoading: false,
      isSyncing: false,

      addUserRecord: async (record) => {
        // Add to local state
        set((state) => ({
          userRecords: [record, ...state.userRecords].slice(0, 100),
        }));

        // Sync to Firebase
        try {
          await userRecordsSync.set(record.id, record);
        } catch (error) {
          console.error('Failed to sync user record to Firebase:', error);
        }
      },

      updateUserRecord: (id, updates) =>
        set((state) => ({
          userRecords: state.userRecords.map((record) =>
            record.id === id ? { ...record, ...updates } : record
          ),
        })),

      removeUserRecord: async (id) => {
        // Remove from local state
        set((state) => ({
          userRecords: state.userRecords.filter((record) => record.id !== id),
        }));

        // Remove from Firebase
        try {
          await userRecordsSync.delete(id);
        } catch (error) {
          console.error('Failed to delete user record from Firebase:', error);
        }
      },

      clearUserRecords: () => set({ userRecords: [] }),

      publishRecord: async (record, publishedBy) => {
        const publishedRecord: PublishedSlippageRecord = {
          ...record,
          publishedAt: Date.now(),
          publishedBy,
        };

        // Add to local state
        set((state) => ({
          publishedRecords: [publishedRecord, ...state.publishedRecords].slice(0, 200),
        }));

        // Sync to Firebase
        try {
          await publishedRecordsSync.set(publishedRecord.id, publishedRecord);
        } catch (error) {
          console.error('Failed to publish record to Firebase:', error);
        }
      },

      removePublishedRecord: async (id) => {
        // Remove from local state
        set((state) => ({
          publishedRecords: state.publishedRecords.filter((record) => record.id !== id),
        }));

        // Remove from Firebase
        try {
          await publishedRecordsSync.delete(id);
        } catch (error) {
          console.error('Failed to delete published record from Firebase:', error);
        }
      },

      clearPublishedRecords: () => set({ publishedRecords: [] }),

      // Sync user records from Firebase (filtered by current user)
      syncUserRecords: async () => {
        const currentUser = useAuthStore.getState().currentUser;
        if (!currentUser) return;

        set({ isSyncing: true });
        try {
          const allRecords = await userRecordsSync.fetchAll();
          // Filter to only show current user's records
          const userRecords = allRecords.filter(r => r.userId === currentUser.id);
          set({ userRecords, isSyncing: false });
        } catch (error) {
          console.error('Failed to sync user records from Firebase:', error);
          set({ isSyncing: false });
        }
      },

      // Sync published records from Firebase (available to all users)
      syncPublishedRecords: async () => {
        set({ isSyncing: true });
        try {
          const publishedRecords = await publishedRecordsSync.fetchAll();
          set({ publishedRecords, isSyncing: false });
        } catch (error) {
          console.error('Failed to sync published records from Firebase:', error);
          set({ isSyncing: false });
        }
      },

      // Subscribe to real-time updates for published records
      subscribeToPublishedRecords: () => {
        return publishedRecordsSync.subscribe((publishedRecords) => {
          set({ publishedRecords });
        });
      },
    }),
    {
      name: 'slippage-history-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

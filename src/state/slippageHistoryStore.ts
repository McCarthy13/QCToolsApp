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
  strandPattern: string; // Design bottom strand pattern (or cast if not specified separately)
  topStrandPattern?: string; // Design top strand pattern (or cast if not specified separately)
  castStrandPattern?: string; // Cast bottom strand pattern (for comparison with design)
  castTopStrandPattern?: string; // Cast top strand pattern (for comparison with design)
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
        console.log('[SlippageHistoryStore] Adding user record:', {
          id: record.id,
          userId: record.userId,
          timestamp: record.timestamp,
          hasSlippages: record.slippages?.length > 0,
        });

        // Add to local state
        set((state) => ({
          userRecords: [record, ...state.userRecords].slice(0, 100),
        }));

        // Sync to Firebase
        try {
          console.log('[SlippageHistoryStore] Syncing to Firebase...');
          await userRecordsSync.set(record.id, record);
          console.log('[SlippageHistoryStore] Successfully synced to Firebase');
        } catch (error) {
          console.error('[SlippageHistoryStore] Failed to sync user record to Firebase:', error);
          // Show more detailed error information
          if (error instanceof Error) {
            console.error('[SlippageHistoryStore] Error message:', error.message);
            console.error('[SlippageHistoryStore] Error stack:', error.stack);
          }
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
        console.log('[SlippageHistoryStore] syncUserRecords called. Current user:', currentUser?.email);
        console.log('[SlippageHistoryStore] Current user FULL object:', JSON.stringify(currentUser, null, 2));
        console.log('[SlippageHistoryStore] Current user ID specifically:', currentUser?.id);
        console.log('[SlippageHistoryStore] Type of user ID:', typeof currentUser?.id);

        if (!currentUser) {
          console.log('[SlippageHistoryStore] No current user, skipping sync');
          return;
        }

        set({ isSyncing: true });
        try {
          console.log('[SlippageHistoryStore] Fetching all records from Firebase...');
          const allRecords = await userRecordsSync.fetchAll();
          console.log('[SlippageHistoryStore] Fetched', allRecords.length, 'total records');

          // Log sample record to see what userId values look like
          if (allRecords.length > 0) {
            console.log('[SlippageHistoryStore] Sample record:', JSON.stringify(allRecords[0], null, 2));
          }

          // Migration: Update any records with productType "1048" to "1047"
          const migratedRecords = allRecords.map(record => {
            if (record.config.productType === '1048') {
              console.log(`[Migration] Updating slippage record ${record.id} from product type 1048 to 1047`);
              const migratedRecord = {
                ...record,
                config: { ...record.config, productType: '1047' }
              };
              // Update in Firebase
              userRecordsSync.set(record.id, migratedRecord).catch(err =>
                console.error(`Failed to migrate record ${record.id}:`, err)
              );
              return migratedRecord;
            }
            return record;
          });

          // Filter to only show current user's records
          const userRecords = migratedRecords.filter(r => r.userId === currentUser.id);
          console.log('[SlippageHistoryStore] Filtered to', userRecords.length, 'user records for userId:', currentUser.id);

          set({ userRecords, isSyncing: false });
        } catch (error) {
          console.error('[SlippageHistoryStore] Failed to sync user records from Firebase:', error);
          if (error instanceof Error) {
            console.error('[SlippageHistoryStore] Error message:', error.message);
          }
          set({ isSyncing: false });
        }
      },

      // Sync published records from Firebase (available to all users)
      syncPublishedRecords: async () => {
        set({ isSyncing: true });
        try {
          const publishedRecords = await publishedRecordsSync.fetchAll();

          // Migration: Update any published records with productType "1048" to "1047"
          const migratedRecords = publishedRecords.map(record => {
            if (record.config.productType === '1048') {
              console.log(`[Migration] Updating published record ${record.id} from product type 1048 to 1047`);
              const migratedRecord = {
                ...record,
                config: { ...record.config, productType: '1047' }
              };
              // Update in Firebase
              publishedRecordsSync.set(record.id, migratedRecord).catch(err =>
                console.error(`Failed to migrate published record ${record.id}:`, err)
              );
              return migratedRecord;
            }
            return record;
          });

          set({ publishedRecords: migratedRecords, isSyncing: false });
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

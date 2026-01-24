import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QualityLogEntry,
  QualityCode,
  ImportBatch,
  Disposition,
  DispositionValue,
  ProductType,
  BedNumber,
  getStatusFromDisposition,
  shouldSetApprovalDate,
} from '../types/quality-log';
import { firestore, auth } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';

interface QualityLogState {
  // Data
  entries: QualityLogEntry[];
  issueCodes: QualityCode[];
  rejectCodes: QualityCode[];
  importBatches: ImportBatch[];
  isLoading: boolean;

  // Firebase subscriptions
  unsubscribeEntries: Unsubscribe | null;
  unsubscribeIssueCodes: Unsubscribe | null;
  unsubscribeRejectCodes: Unsubscribe | null;

  // Initialize Firebase listeners
  initialize: () => void;
  cleanup: () => void;

  // Entry operations
  addEntry: (entry: Omit<QualityLogEntry, 'id' | 'importedAt' | 'updatedAt'>) => Promise<string>;
  addEntries: (entries: Omit<QualityLogEntry, 'id' | 'importedAt' | 'updatedAt'>[]) => Promise<string[]>;
  updateEntry: (id: string, updates: Partial<QualityLogEntry>, skipConfirmation?: boolean) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryByIdNumber: (idNumber: string) => QualityLogEntry | undefined;

  // Disposition change (handles auto-status and auto-date)
  setDisposition: (id: string, disposition: DispositionValue) => Promise<void>;

  // Issue/Reject code operations
  addIssueCode: (code: Omit<QualityCode, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIssueCode: (id: string, updates: Partial<QualityCode>) => Promise<void>;
  deleteIssueCode: (id: string) => Promise<void>;

  addRejectCode: (code: Omit<QualityCode, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRejectCode: (id: string, updates: Partial<QualityCode>) => Promise<void>;
  deleteRejectCode: (id: string) => Promise<void>;

  // Import batch tracking
  addImportBatch: (batch: Omit<ImportBatch, 'id' | 'importedAt'>) => Promise<string>;

  // Utility
  clearAllEntries: () => Promise<void>;
  initializeDefaultCodes: () => Promise<void>;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

export const useQualityLogStore = create<QualityLogState>()(
  persist(
    (set, get) => ({
      entries: [],
      issueCodes: [],
      rejectCodes: [],
      importBatches: [],
      isLoading: false,
      unsubscribeEntries: null,
      unsubscribeIssueCodes: null,
      unsubscribeRejectCodes: null,

      initialize: () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('[QualityLogStore] No user logged in, skipping initialization');
          return;
        }

        // Subscribe to entries
        const entriesQuery = query(
          collection(firestore, 'qualityLogEntries'),
          orderBy('pourDate', 'desc')
        );
        const unsubEntries = onSnapshot(entriesQuery, (snapshot) => {
          const entries: QualityLogEntry[] = [];
          snapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() } as QualityLogEntry);
          });
          set({ entries });
        }, (error) => {
          console.error('[QualityLogStore] Entries subscription error:', error);
        });

        // Subscribe to issue codes
        const issueCodesQuery = query(
          collection(firestore, 'qualityIssueCodes'),
          orderBy('code')
        );
        const unsubIssueCodes = onSnapshot(issueCodesQuery, (snapshot) => {
          const codes: QualityCode[] = [];
          snapshot.forEach((doc) => {
            codes.push({ id: doc.id, ...doc.data() } as QualityCode);
          });
          set({ issueCodes: codes });
        }, (error) => {
          console.error('[QualityLogStore] Issue codes subscription error:', error);
        });

        // Subscribe to reject codes
        const rejectCodesQuery = query(
          collection(firestore, 'qualityRejectCodes'),
          orderBy('code')
        );
        const unsubRejectCodes = onSnapshot(rejectCodesQuery, (snapshot) => {
          const codes: QualityCode[] = [];
          snapshot.forEach((doc) => {
            codes.push({ id: doc.id, ...doc.data() } as QualityCode);
          });
          set({ rejectCodes: codes });
        }, (error) => {
          console.error('[QualityLogStore] Reject codes subscription error:', error);
        });

        set({
          unsubscribeEntries: unsubEntries,
          unsubscribeIssueCodes: unsubIssueCodes,
          unsubscribeRejectCodes: unsubRejectCodes,
        });

        // Initialize default codes if needed
        get().initializeDefaultCodes();
      },

      cleanup: () => {
        const { unsubscribeEntries, unsubscribeIssueCodes, unsubscribeRejectCodes } = get();
        if (unsubscribeEntries) unsubscribeEntries();
        if (unsubscribeIssueCodes) unsubscribeIssueCodes();
        if (unsubscribeRejectCodes) unsubscribeRejectCodes();
        set({
          unsubscribeEntries: null,
          unsubscribeIssueCodes: null,
          unsubscribeRejectCodes: null,
        });
      },

      addEntry: async (entry) => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User not logged in');

        const id = generateId();
        const now = Date.now();
        const newEntry: QualityLogEntry = {
          ...entry,
          id,
          importedAt: now,
          updatedAt: now,
          importedBy: currentUser.email || 'unknown',
          issueCodes: entry.issueCodes || [],
          rejectCodes: entry.rejectCodes || [],
          disposition: entry.disposition || 'Scheduled',
          status: entry.status || '40',
        };

        await setDoc(doc(firestore, 'qualityLogEntries', id), newEntry);
        return id;
      },

      addEntries: async (entries) => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User not logged in');

        const ids: string[] = [];
        const now = Date.now();

        for (const entry of entries) {
          // Check for duplicate ID number
          const existing = get().getEntryByIdNumber(entry.idNumber);
          if (existing) {
            console.log(`[QualityLogStore] Skipping duplicate ID #: ${entry.idNumber}`);
            continue;
          }

          const id = generateId();
          ids.push(id);
          const newEntry: QualityLogEntry = {
            ...entry,
            id,
            importedAt: now,
            updatedAt: now,
            importedBy: currentUser.email || 'unknown',
            issueCodes: entry.issueCodes || [],
            rejectCodes: entry.rejectCodes || [],
            disposition: entry.disposition || 'Scheduled',
            status: entry.status || '40',
          };

          await setDoc(doc(firestore, 'qualityLogEntries', id), newEntry);
        }

        return ids;
      },

      updateEntry: async (id, updates) => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User not logged in');

        const entry = get().entries.find((e) => e.id === id);
        if (!entry) throw new Error('Entry not found');

        const updatedEntry = {
          ...entry,
          ...updates,
          updatedAt: Date.now(),
          updatedBy: currentUser.email || 'unknown',
        };

        await setDoc(doc(firestore, 'qualityLogEntries', id), updatedEntry);
      },

      deleteEntry: async (id) => {
        await deleteDoc(doc(firestore, 'qualityLogEntries', id));
      },

      getEntryByIdNumber: (idNumber) => {
        return get().entries.find((e) => e.idNumber === idNumber);
      },

      setDisposition: async (id, disposition) => {
        const entry = get().entries.find((e) => e.id === id);
        if (!entry) throw new Error('Entry not found');

        const { status, color } = getStatusFromDisposition(disposition);
        const updates: Partial<QualityLogEntry> = {
          disposition,
          status,
        };

        // Set approval/rejection date if needed
        if (shouldSetApprovalDate(disposition)) {
          updates.approvalRejectionDate = formatDate(new Date());
        }

        // Mark hadEngDisposition if disposition includes Eng (triggers yard status workflow)
        if (disposition.includes('Eng') && !entry.hadEngDisposition) {
          updates.hadEngDisposition = true;
        }

        await get().updateEntry(id, updates);
      },

      // Issue code operations
      addIssueCode: async (code) => {
        const id = generateId();
        const now = Date.now();
        const newCode: QualityCode = {
          ...code,
          id,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(firestore, 'qualityIssueCodes', id), newCode);
      },

      updateIssueCode: async (id, updates) => {
        const code = get().issueCodes.find((c) => c.id === id);
        if (!code) throw new Error('Issue code not found');
        await setDoc(doc(firestore, 'qualityIssueCodes', id), {
          ...code,
          ...updates,
          updatedAt: Date.now(),
        });
      },

      deleteIssueCode: async (id) => {
        await deleteDoc(doc(firestore, 'qualityIssueCodes', id));
      },

      // Reject code operations
      addRejectCode: async (code) => {
        const id = generateId();
        const now = Date.now();
        const newCode: QualityCode = {
          ...code,
          id,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(firestore, 'qualityRejectCodes', id), newCode);
      },

      updateRejectCode: async (id, updates) => {
        const code = get().rejectCodes.find((c) => c.id === id);
        if (!code) throw new Error('Reject code not found');
        await setDoc(doc(firestore, 'qualityRejectCodes', id), {
          ...code,
          ...updates,
          updatedAt: Date.now(),
        });
      },

      deleteRejectCode: async (id) => {
        await deleteDoc(doc(firestore, 'qualityRejectCodes', id));
      },

      // Import batch tracking
      addImportBatch: async (batch) => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User not logged in');

        const id = generateId();
        const newBatch: ImportBatch = {
          ...batch,
          id,
          importedAt: Date.now(),
          importedBy: currentUser.email || 'unknown',
        };

        set((state) => ({
          importBatches: [...state.importBatches, newBatch],
        }));

        return id;
      },

      clearAllEntries: async () => {
        const entries = get().entries;
        for (const entry of entries) {
          await deleteDoc(doc(firestore, 'qualityLogEntries', entry.id));
        }
      },

      initializeDefaultCodes: async () => {
        const { issueCodes, rejectCodes } = get();

        // Initialize default issue codes if none exist
        if (issueCodes.length === 0) {
          const defaultIssueCodes = [
            { code: '1', description: 'Surface Defect', isActive: true },
            { code: '2', description: 'Dimensional Issue', isActive: true },
            { code: '3', description: 'Strand Slippage', isActive: true },
            { code: '4', description: 'Concrete Quality', isActive: true },
            { code: '5', description: 'Embedded Item Issue', isActive: true },
          ];

          for (const code of defaultIssueCodes) {
            await get().addIssueCode(code);
          }
        }

        // Initialize default reject codes if none exist
        if (rejectCodes.length === 0) {
          const defaultRejectCodes = [
            { code: 'R1', description: 'Critical Surface Defect', isActive: true },
            { code: 'R2', description: 'Out of Tolerance', isActive: true },
            { code: 'R3', description: 'Structural Issue', isActive: true },
            { code: 'R4', description: 'Wrong Strand Pattern', isActive: true },
            { code: 'R5', description: 'Concrete Failure', isActive: true },
          ];

          for (const code of defaultRejectCodes) {
            await get().addRejectCode(code);
          }
        }
      },
    }),
    {
      name: 'quality-log-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        importBatches: state.importBatches,
      }),
    }
  )
);

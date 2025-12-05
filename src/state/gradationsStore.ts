import { create } from 'zustand';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';
import { AggregateConfig, TestRecord, ActiveTest, SieveData } from '../types/aggregate-gradation';
import { DEFAULT_AGGREGATES } from '../utils/aggregate-gradation-constants';
import { calculateTestData, calculateFinenessModulus, calculateDecant, checkC33Compliance } from '../utils/aggregate-gradation-calculations';

interface GradationsState {
  // Data
  aggregates: Record<string, AggregateConfig>;
  savedRecords: TestRecord[];
  defaultAggregates: string[];
  activeTests: ActiveTest[];

  // UI State
  currentView: 'main' | 'admin' | 'repository' | 'configureDefaults';
  selectedAggregate: string;
  date: string;
  showAddMore: boolean;
  showPrintModal: boolean;
  error: string | null;
  successMessage: string | null;
  editingAggregate: string | null;
  showAddForm: boolean;
  newAggregateName: string;
  newAggregateType: 'Fine' | 'Coarse';
  importFromExisting: string;
  confirmingDelete: string | null;
  showSieveSelector: string | null;
  confirmingDeleteRecord: string | null;
  filterAggregate: string;
  filterType: string;
  filterDateFrom: string;
  filterDateTo: string;
  filterMaterialName: string;
  viewingRecord: TestRecord | null;
  showExportOptions: string | null;
  selectedDefaults: string[];
  showNoProductionDateRange: boolean;
  noProductionStartDate: string;
  noProductionEndDate: string;
  editingRecord: TestRecord | null;
  showEditModal: boolean;
  isLoading: boolean;

  // Actions
  setCurrentView: (view: 'main' | 'admin' | 'repository' | 'configureDefaults') => void;
  setSelectedAggregate: (name: string) => void;
  setDate: (date: string) => void;
  addActiveTest: () => void;
  removeActiveTest: (index: number) => void;
  updateTestMaterialName: (index: number, name: string) => void;
  updateTestWeight: (testIndex: number, sieveIndex: number, weight: string) => void;
  updateTestWashedWeight: (index: number, weight: string) => void;
  calculateActiveTest: (index: number) => void;
  calculateAllActiveTests: () => void;
  saveTests: () => Promise<void>;
  clearActiveTests: () => void;

  // Aggregate management
  loadAggregates: () => Promise<void>;
  addAggregate: (name: string, config: AggregateConfig) => Promise<void>;
  updateAggregate: (name: string, config: AggregateConfig) => Promise<void>;
  deleteAggregate: (name: string) => Promise<void>;
  setEditingAggregate: (name: string | null) => void;
  setShowAddForm: (show: boolean) => void;
  setNewAggregateName: (name: string) => void;
  setNewAggregateType: (type: 'Fine' | 'Coarse') => void;
  setImportFromExisting: (name: string) => void;

  // Record management
  loadRecords: () => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  updateRecord: (id: string, updates: Partial<TestRecord>) => Promise<void>;
  setViewingRecord: (record: TestRecord | null) => void;
  setEditingRecord: (record: TestRecord | null) => void;

  // Filter actions
  setFilterAggregate: (name: string) => void;
  setFilterType: (type: string) => void;
  setFilterDateFrom: (date: string) => void;
  setFilterDateTo: (date: string) => void;
  setFilterMaterialName: (name: string) => void;

  // Default aggregates
  loadDefaultAggregates: () => Promise<void>;
  saveDefaultAggregates: (defaults: string[]) => Promise<void>;

  // UI helpers
  setError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  setShowPrintModal: (show: boolean) => void;
  setConfirmingDelete: (name: string | null) => void;
  setConfirmingDeleteRecord: (id: string | null) => void;
  setShowExportOptions: (id: string | null) => void;
}

export const useGradationsStore = create<GradationsState>((set, get) => ({
  // Initial state
  aggregates: DEFAULT_AGGREGATES,
  savedRecords: [],
  defaultAggregates: ['Keystone #7', 'Concrete Sand'],
  activeTests: [],
  currentView: 'main',
  selectedAggregate: '',
  date: new Date().toISOString().split('T')[0],
  showAddMore: false,
  showPrintModal: false,
  error: null,
  successMessage: null,
  editingAggregate: null,
  showAddForm: false,
  newAggregateName: '',
  newAggregateType: 'Fine',
  importFromExisting: '',
  confirmingDelete: null,
  showSieveSelector: null,
  confirmingDeleteRecord: null,
  filterAggregate: '',
  filterType: '',
  filterDateFrom: '',
  filterDateTo: '',
  filterMaterialName: '',
  viewingRecord: null,
  showExportOptions: null,
  selectedDefaults: [],
  showNoProductionDateRange: false,
  noProductionStartDate: new Date().toISOString().split('T')[0],
  noProductionEndDate: new Date().toISOString().split('T')[0],
  editingRecord: null,
  showEditModal: false,
  isLoading: false,

  // View actions
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedAggregate: (name) => {
    const state = get();
    const aggregate = state.aggregates[name];
    if (aggregate) {
      set({
        selectedAggregate: name,
        activeTests: [{
          materialName: '',
          sieveData: aggregate.sieves.map(s => ({ ...s, weightRetained: '' })),
          washedWeight: '',
          decant: '0.00',
          finenessModulus: 'N/A',
          totalWeight: 0,
          passes: true
        }]
      });
    }
  },
  setDate: (date) => set({ date }),

  // Active test actions
  addActiveTest: () => {
    const state = get();
    if (!state.selectedAggregate) return;
    const aggregate = state.aggregates[state.selectedAggregate];
    const newTest: ActiveTest = {
      materialName: '',
      sieveData: aggregate.sieves.map(s => ({ ...s, weightRetained: '' })),
      washedWeight: '',
      decant: '0.00',
      finenessModulus: 'N/A',
      totalWeight: 0,
      passes: true
    };
    set({ activeTests: [...state.activeTests, newTest] });
  },

  removeActiveTest: (index) => {
    const state = get();
    const newTests = state.activeTests.filter((_, i) => i !== index);
    set({ activeTests: newTests });
  },

  updateTestMaterialName: (index, name) => {
    const state = get();
    const newTests = [...state.activeTests];
    newTests[index] = { ...newTests[index], materialName: name };
    set({ activeTests: newTests });
  },

  updateTestWeight: (testIndex, sieveIndex, weight) => {
    const state = get();
    const newTests = [...state.activeTests];
    const newSieveData = [...newTests[testIndex].sieveData];
    newSieveData[sieveIndex] = { ...newSieveData[sieveIndex], weightRetained: weight };
    newTests[testIndex] = { ...newTests[testIndex], sieveData: newSieveData };
    set({ activeTests: newTests });
  },

  updateTestWashedWeight: (index, weight) => {
    const state = get();
    const newTests = [...state.activeTests];
    newTests[index] = { ...newTests[index], washedWeight: weight };
    set({ activeTests: newTests });
  },

  calculateActiveTest: (index) => {
    const state = get();
    const test = state.activeTests[index];
    const aggregate = state.aggregates[state.selectedAggregate];

    const calculatedSieves = calculateTestData(test.sieveData);
    const totalWeight = calculatedSieves.reduce(
      (sum, row) => sum + (parseFloat(row.weightRetained as string) || 0),
      0
    );
    const finenessModulus = calculateFinenessModulus(aggregate.type, calculatedSieves);
    const decant = test.washedWeight
      ? calculateDecant(calculatedSieves, parseFloat(test.washedWeight))
      : '0.00';
    const passes = checkC33Compliance(calculatedSieves);

    const newTests = [...state.activeTests];
    newTests[index] = {
      ...test,
      sieveData: calculatedSieves,
      totalWeight,
      finenessModulus,
      decant,
      passes
    };
    set({ activeTests: newTests });
  },

  calculateAllActiveTests: () => {
    const state = get();
    state.activeTests.forEach((_, index) => {
      get().calculateActiveTest(index);
    });
  },

  saveTests: async () => {
    const state = get();
    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ error: 'User not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const aggregate = state.aggregates[state.selectedAggregate];
      const recordsRef = collection(firestore, 'users', userId, 'gradationRecords');

      for (const test of state.activeTests) {
        const record: TestRecord = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          aggregateName: state.selectedAggregate,
          aggregateType: aggregate.type,
          date: state.date,
          materialName: test.materialName,
          sieveData: test.sieveData,
          washedWeight: test.washedWeight,
          finenessModulus: test.finenessModulus,
          decant: test.decant,
          totalWeight: test.totalWeight,
          passes: test.passes
        };

        await setDoc(doc(recordsRef, record.id), record);
      }

      await get().loadRecords();
      set({
        activeTests: [],
        selectedAggregate: '',
        successMessage: `Saved ${state.activeTests.length} test(s) successfully`,
        isLoading: false
      });

      // Clear success message after 3 seconds
      setTimeout(() => set({ successMessage: null }), 3000);
    } catch (error: any) {
      console.error('Error saving tests:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  clearActiveTests: () => set({ activeTests: [], selectedAggregate: '' }),

  // Aggregate management
  loadAggregates: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const aggregatesRef = collection(firestore, 'users', userId, 'gradationAggregates');
      const snapshot = await getDocs(aggregatesRef);

      if (snapshot.empty) {
        // Initialize with defaults
        for (const [name, config] of Object.entries(DEFAULT_AGGREGATES)) {
          await setDoc(doc(aggregatesRef, name), config);
        }
        set({ aggregates: DEFAULT_AGGREGATES });
      } else {
        const aggregates: Record<string, AggregateConfig> = {};
        snapshot.forEach((doc) => {
          aggregates[doc.id] = doc.data() as AggregateConfig;
        });
        set({ aggregates });
      }
    } catch (error) {
      console.error('Error loading aggregates:', error);
      set({ aggregates: DEFAULT_AGGREGATES });
    }
  },

  addAggregate: async (name, config) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ error: 'User not authenticated' });
      return;
    }

    try {
      const aggregateRef = doc(firestore, 'users', userId, 'gradationAggregates', name);
      await setDoc(aggregateRef, config);

      const state = get();
      set({
        aggregates: { ...state.aggregates, [name]: config },
        successMessage: `Aggregate "${name}" added successfully`
      });

      setTimeout(() => set({ successMessage: null }), 3000);
    } catch (error: any) {
      console.error('Error adding aggregate:', error);
      set({ error: error.message });
    }
  },

  updateAggregate: async (name, config) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ error: 'User not authenticated' });
      return;
    }

    try {
      const aggregateRef = doc(firestore, 'users', userId, 'gradationAggregates', name);
      await setDoc(aggregateRef, config);

      const state = get();
      set({
        aggregates: { ...state.aggregates, [name]: config },
        successMessage: `Aggregate "${name}" updated successfully`
      });

      setTimeout(() => set({ successMessage: null }), 3000);
    } catch (error: any) {
      console.error('Error updating aggregate:', error);
      set({ error: error.message });
    }
  },

  deleteAggregate: async (name) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ error: 'User not authenticated' });
      return;
    }

    try {
      const aggregateRef = doc(firestore, 'users', userId, 'gradationAggregates', name);
      await deleteDoc(aggregateRef);

      const state = get();
      const { [name]: deleted, ...remaining } = state.aggregates;
      set({
        aggregates: remaining,
        defaultAggregates: state.defaultAggregates.filter(n => n !== name),
        successMessage: `Aggregate "${name}" deleted successfully`
      });

      setTimeout(() => set({ successMessage: null }), 3000);
    } catch (error: any) {
      console.error('Error deleting aggregate:', error);
      set({ error: error.message });
    }
  },

  setEditingAggregate: (name) => set({ editingAggregate: name }),
  setShowAddForm: (show) => set({ showAddForm: show }),
  setNewAggregateName: (name) => set({ newAggregateName: name }),
  setNewAggregateType: (type) => set({ newAggregateType: type }),
  setImportFromExisting: (name) => set({ importFromExisting: name }),

  // Record management
  loadRecords: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const recordsRef = collection(firestore, 'users', userId, 'gradationRecords');
      const q = query(recordsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);

      const records: TestRecord[] = [];
      snapshot.forEach((doc) => {
        records.push(doc.data() as TestRecord);
      });

      set({ savedRecords: records });
    } catch (error) {
      console.error('Error loading records:', error);
    }
  },

  deleteRecord: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ error: 'User not authenticated' });
      return;
    }

    try {
      const recordRef = doc(firestore, 'users', userId, 'gradationRecords', id);
      await deleteDoc(recordRef);

      const state = get();
      set({
        savedRecords: state.savedRecords.filter(r => r.id !== id),
        successMessage: 'Record deleted successfully'
      });

      setTimeout(() => set({ successMessage: null }), 3000);
    } catch (error: any) {
      console.error('Error deleting record:', error);
      set({ error: error.message });
    }
  },

  updateRecord: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ error: 'User not authenticated' });
      return;
    }

    try {
      const recordRef = doc(firestore, 'users', userId, 'gradationRecords', id);
      const docSnap = await getDoc(recordRef);

      if (docSnap.exists()) {
        const updated = { ...docSnap.data(), ...updates };
        await setDoc(recordRef, updated);

        const state = get();
        set({
          savedRecords: state.savedRecords.map(r => r.id === id ? updated as TestRecord : r),
          successMessage: 'Record updated successfully'
        });

        setTimeout(() => set({ successMessage: null }), 3000);
      }
    } catch (error: any) {
      console.error('Error updating record:', error);
      set({ error: error.message });
    }
  },

  setViewingRecord: (record) => set({ viewingRecord: record }),
  setEditingRecord: (record) => set({ editingRecord: record, showEditModal: record !== null }),

  // Filter actions
  setFilterAggregate: (name) => set({ filterAggregate: name }),
  setFilterType: (type) => set({ filterType: type }),
  setFilterDateFrom: (date) => set({ filterDateFrom: date }),
  setFilterDateTo: (date) => set({ filterDateTo: date }),
  setFilterMaterialName: (name) => set({ filterMaterialName: name }),

  // Default aggregates
  loadDefaultAggregates: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const defaultsRef = doc(firestore, 'users', userId, 'gradationSettings', 'defaults');
      const docSnap = await getDoc(defaultsRef);

      if (docSnap.exists()) {
        set({ defaultAggregates: docSnap.data().aggregates || [] });
      }
    } catch (error) {
      console.error('Error loading default aggregates:', error);
    }
  },

  saveDefaultAggregates: async (defaults) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ error: 'User not authenticated' });
      return;
    }

    try {
      const defaultsRef = doc(firestore, 'users', userId, 'gradationSettings', 'defaults');
      await setDoc(defaultsRef, { aggregates: defaults });

      set({
        defaultAggregates: defaults,
        successMessage: 'Default aggregates saved successfully'
      });

      setTimeout(() => set({ successMessage: null }), 3000);
    } catch (error: any) {
      console.error('Error saving default aggregates:', error);
      set({ error: error.message });
    }
  },

  // UI helpers
  setError: (error) => set({ error }),
  setSuccessMessage: (message) => set({ successMessage: message }),
  setShowPrintModal: (show) => set({ showPrintModal: show }),
  setConfirmingDelete: (name) => set({ confirmingDelete: name }),
  setConfirmingDeleteRecord: (id) => set({ confirmingDeleteRecord: id }),
  setShowExportOptions: (id) => set({ showExportOptions: id }),
}));

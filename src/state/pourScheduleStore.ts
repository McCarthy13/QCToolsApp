import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PourEntry, DailySchedule, FormBed, PourDepartment, DEFAULT_FORMS } from '../types/pour-schedule';
import { fetchEliPlanSchedule, EliPlanScheduleItem, mapEliPlanDepartment, mapEliPlanStatus } from '../api/eliplan';

interface PourScheduleState {
  // Data
  pourEntries: PourEntry[];
  schedules: DailySchedule[];
  forms: FormBed[];
  lastSyncTime: number | null;
  
  // Form/Bed Operations
  addForm: (form: Omit<FormBed, 'id'>) => string;
  updateForm: (id: string, updates: Partial<FormBed>) => void;
  deleteForm: (id: string) => void;
  getForm: (id: string) => FormBed | undefined;
  getFormsByDepartment: (department: PourDepartment) => FormBed[];
  
  // Pour Entry Operations
  addPourEntry: (entry: Omit<PourEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePourEntry: (id: string, updates: Partial<PourEntry>) => void;
  deletePourEntry: (id: string) => void;
  getPourEntry: (id: string) => PourEntry | undefined;
  
  // Query Operations
  getPourEntriesByDate: (date: number, department?: PourDepartment) => PourEntry[];
  getPourEntriesByFormBed: (formBedId: string) => PourEntry[];
  getPourEntriesByDateRange: (startDate: number, endDate: number) => PourEntry[];
  
  // Schedule Operations
  getScheduleForDate: (date: number, department: PourDepartment) => DailySchedule | undefined;
  getTotalYardsForDate: (date: number, department?: PourDepartment) => number;
  
  // EliPlan Sync
  syncWithEliPlan: (date: Date, createdBy: string) => Promise<{ success: boolean; imported: number; error?: string }>;
  
  // Utility
  clearAllData: () => void;
  initializeDefaultForms: () => void;
}

export const usePourScheduleStore = create<PourScheduleState>()(
  persist(
    (set, get) => ({
      pourEntries: [],
      schedules: [],
      forms: [],
      lastSyncTime: null,
      
      // Form/Bed Operations
      addForm: (form) => {
        const id = `form-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newForm: FormBed = {
          ...form,
          id,
        };
        
        set((state) => ({
          forms: [...state.forms, newForm],
        }));
        
        return id;
      },
      
      updateForm: (id, updates) => {
        set((state) => ({
          forms: state.forms.map((form) =>
            form.id === id ? { ...form, ...updates } : form
          ),
        }));
      },
      
      deleteForm: (id) => {
        set((state) => ({
          forms: state.forms.filter((form) => form.id !== id),
        }));
      },
      
      getForm: (id) => {
        return get().forms.find((form) => form.id === id);
      },
      
      getFormsByDepartment: (department) => {
        return get().forms
          .filter((form) => form.department === department && form.isActive)
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      
      // Pour Entry Operations
      addPourEntry: (entry) => {
        const id = `pour-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newEntry: PourEntry = {
          ...entry,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          pourEntries: [...state.pourEntries, newEntry],
        }));
        
        return id;
      },
      
      updatePourEntry: (id, updates) => {
        set((state) => ({
          pourEntries: state.pourEntries.map((entry) =>
            entry.id === id
              ? { ...entry, ...updates, updatedAt: Date.now() }
              : entry
          ),
        }));
      },
      
      deletePourEntry: (id) => {
        set((state) => ({
          pourEntries: state.pourEntries.filter((entry) => entry.id !== id),
        }));
      },
      
      getPourEntry: (id) => {
        return get().pourEntries.find((entry) => entry.id === id);
      },
      
      // Query Operations
      getPourEntriesByDate: (date, department) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return get().pourEntries.filter((entry) => {
          const entryDate = entry.scheduledDate;
          const matchesDate = entryDate >= startOfDay.getTime() && entryDate <= endOfDay.getTime();
          const matchesDepartment = department ? entry.department === department : true;
          return matchesDate && matchesDepartment;
        }).sort((a, b) => {
          // Sort by scheduled time if available, otherwise by creation time
          if (a.scheduledTime && b.scheduledTime) {
            return a.scheduledTime.localeCompare(b.scheduledTime);
          }
          return a.createdAt - b.createdAt;
        });
      },
      
      getPourEntriesByFormBed: (formBedId) => {
        return get().pourEntries
          .filter((entry) => entry.formBedId === formBedId)
          .sort((a, b) => b.scheduledDate - a.scheduledDate);
      },
      
      getPourEntriesByDateRange: (startDate, endDate) => {
        return get().pourEntries
          .filter((entry) => entry.scheduledDate >= startDate && entry.scheduledDate <= endDate)
          .sort((a, b) => a.scheduledDate - b.scheduledDate);
      },
      
      // Schedule Operations
      getScheduleForDate: (date, department) => {
        const entries = get().getPourEntriesByDate(date, department);
        
        if (entries.length === 0) {
          return undefined;
        }
        
        const totalYards = entries.reduce((sum, entry) => sum + (entry.concreteYards || 0), 0);
        
        return {
          id: `schedule-${date}-${department}`,
          date,
          department,
          pourEntries: entries,
          totalYards,
          createdBy: entries[0]?.createdBy || 'system',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      },
      
      getTotalYardsForDate: (date, department) => {
        const entries = get().getPourEntriesByDate(date, department);
        return entries.reduce((sum, entry) => sum + (entry.concreteYards || 0), 0);
      },
      
      // EliPlan Sync
      syncWithEliPlan: async (date, createdBy) => {
        try {
          // Fetch data from EliPlan
          const eliplanData = await fetchEliPlanSchedule(date);
          
          const state = get();
          let imported = 0;
          
          // Process each EliPlan item
          for (const item of eliplanData) {
            // Map department
            const department = mapEliPlanDepartment(item.department);
            if (!department) {
              console.warn(`Skipping item with unmapped department: ${item.department}`);
              continue;
            }
            
            // Find or create form/bed
            let formBedId: string | undefined;
            let formBedName = item.workstation || 'Unknown';
            
            // Try to find existing form
            const existingForm = state.forms.find(
              f => f.department === department && 
              f.name.toLowerCase() === formBedName.toLowerCase()
            );
            
            if (existingForm) {
              formBedId = existingForm.id;
              formBedName = existingForm.name;
            } else {
              // Create new form if workstation is provided
              if (item.workstation) {
                formBedId = state.addForm({
                  name: item.workstation,
                  department,
                  isActive: true,
                  notes: 'Auto-created from EliPlan',
                });
              } else {
                // Skip if no workstation specified
                console.warn(`Skipping item without workstation: Job ${item.jobNumber}`);
                continue;
              }
            }
            
            // Check if entry already exists for this job/date/form
            const existingEntry = state.pourEntries.find(
              e => e.jobNumber === item.jobNumber &&
                   e.scheduledDate === new Date(item.scheduledDate).getTime() &&
                   e.formBedId === formBedId
            );
            
            if (existingEntry) {
              // Update existing entry
              state.updatePourEntry(existingEntry.id, {
                jobName: item.jobName || item.customerName,
                markNumbers: item.markNumber,
                pieceCount: item.pieceCount,
                productType: item.productDescription || item.productCode,
                dimensions: item.dimensions,
                mixDesign: item.concreteGrade || item.mixDesignId,
                concreteYards: item.concreteVolume,
                scheduledTime: item.scheduledStartTime,
                status: mapEliPlanStatus(item.status),
                foreman: item.foreman,
                notes: item.notes ? `${item.notes} (Synced from EliPlan)` : 'Synced from EliPlan',
              });
            } else {
              // Create new entry
              state.addPourEntry({
                formBedId,
                formBedName,
                department,
                jobNumber: item.jobNumber,
                jobName: item.jobName || item.customerName,
                markNumbers: item.markNumber,
                pieceCount: item.pieceCount,
                productType: item.productDescription || item.productCode,
                dimensions: item.dimensions,
                mixDesign: item.concreteGrade || item.mixDesignId,
                concreteYards: item.concreteVolume,
                scheduledDate: new Date(item.scheduledDate).getTime(),
                scheduledTime: item.scheduledStartTime,
                status: mapEliPlanStatus(item.status),
                foreman: item.foreman,
                notes: item.notes ? `${item.notes} (Synced from EliPlan)` : 'Synced from EliPlan',
                createdBy,
              });
              imported++;
            }
          }
          
          // Update sync time
          set({ lastSyncTime: Date.now() });
          
          return {
            success: true,
            imported,
          };
        } catch (error) {
          console.error('EliPlan sync error:', error);
          return {
            success: false,
            imported: 0,
            error: error instanceof Error ? error.message : 'Unknown sync error',
          };
        }
      },
      
      // Utility
      clearAllData: () => {
        set({
          pourEntries: [],
          schedules: [],
          forms: [],
        });
      },
      
      initializeDefaultForms: () => {
        const state = get();
        
        if (state.forms.length === 0) {
          const departments: PourDepartment[] = ['Precast', 'Extruded', 'Wall Panels', 'Flexicore'];
          
          departments.forEach((department) => {
            const formNames = DEFAULT_FORMS[department];
            
            formNames.forEach((formName) => {
              state.addForm({
                name: formName,
                department,
                isActive: true,
              });
            });
          });
        } else {
          // Migration: Add missing Extruded beds if they don't exist
          const extrudedForms = state.forms.filter(f => f.department === 'Extruded');
          const extrudedBedNumbers = ['1', '2', '3', '4', '5', '6'];
          
          extrudedBedNumbers.forEach((bedNum) => {
            const exists = extrudedForms.some(f => f.name === bedNum);
            if (!exists) {
              state.addForm({
                name: bedNum,
                department: 'Extruded',
                isActive: true,
              });
            }
          });
        }
      },
    }),
    {
      name: 'pour-schedule-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

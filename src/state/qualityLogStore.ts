import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QualityLogEntry,
  QualityIssue,
  IssueCode,
  Department,
  DepartmentType,
  ProductionItem,
  QualityMetrics,
  IssueStatus,
  IssueSeverity,
} from '../types/quality-log';

interface QualityLogState {
  // Data
  logs: QualityLogEntry[];
  issueCodes: IssueCode[];
  departments: Department[];
  
  // Quality Log Operations
  addLog: (log: Omit<QualityLogEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateLog: (id: string, updates: Partial<QualityLogEntry>) => void;
  deleteLog: (id: string) => void;
  getLog: (id: string) => QualityLogEntry | undefined;
  getLogsByDepartment: (department: DepartmentType) => QualityLogEntry[];
  getLogsByDateRange: (startDate: number, endDate: number, department?: DepartmentType) => QualityLogEntry[];
  
  // Issue Operations
  addIssueToLog: (logId: string, issue: Omit<QualityIssue, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIssue: (logId: string, issueId: string, updates: Partial<QualityIssue>) => void;
  deleteIssue: (logId: string, issueId: string) => void;
  resolveIssue: (logId: string, issueId: string, resolvedBy: string, actionTaken: string) => void;
  
  // Production Item Operations
  addProductionItem: (logId: string, item: Omit<ProductionItem, 'id'>) => void;
  updateProductionItem: (logId: string, itemId: string, updates: Partial<ProductionItem>) => void;
  deleteProductionItem: (logId: string, itemId: string) => void;
  
  // Issue Code Library Operations
  addIssueCode: (code: Omit<IssueCode, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIssueCode: (id: string, updates: Partial<IssueCode>) => void;
  deleteIssueCode: (id: string) => void;
  getIssueCodeByCode: (code: number) => IssueCode | undefined;
  getIssueCodesByDepartment: (department?: DepartmentType) => IssueCode[];
  
  // Department Operations
  addDepartment: (name: DepartmentType) => void;
  toggleDepartmentActive: (id: string) => void;
  getActiveDepartments: () => Department[];
  
  // Analytics/Metrics
  getMetrics: (department: DepartmentType, startDate: number, endDate: number) => QualityMetrics;
  
  // Utility
  clearAllData: () => void;
  initializeDefaultData: () => void;
}

export const useQualityLogStore = create<QualityLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      issueCodes: [],
      departments: [],
      
      // Quality Log Operations
      addLog: (log) => {
        const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newLog: QualityLogEntry = {
          ...log,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          logs: [...state.logs, newLog],
        }));
        
        return id;
      },
      
      updateLog: (id, updates) => {
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === id
              ? { ...log, ...updates, updatedAt: Date.now() }
              : log
          ),
        }));
      },
      
      deleteLog: (id) => {
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== id),
        }));
      },
      
      getLog: (id) => {
        return get().logs.find((log) => log.id === id);
      },
      
      getLogsByDepartment: (department) => {
        return get().logs.filter((log) => log.department === department)
          .sort((a, b) => b.date - a.date);
      },
      
      getLogsByDateRange: (startDate, endDate, department) => {
        return get().logs.filter((log) => {
          const inRange = log.date >= startDate && log.date <= endDate;
          const inDepartment = department ? log.department === department : true;
          return inRange && inDepartment;
        }).sort((a, b) => b.date - a.date);
      },
      
      // Issue Operations
      addIssueToLog: (logId, issue) => {
        const issueId = `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newIssue: QualityIssue = {
          ...issue,
          id: issueId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  issues: [...(log.issues || []), newIssue],
                  updatedAt: Date.now(),
                }
              : log
          ),
        }));
      },
      
      updateIssue: (logId, issueId, updates) => {
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  issues: (log.issues || []).map((issue) =>
                    issue.id === issueId
                      ? { ...issue, ...updates, updatedAt: Date.now() }
                      : issue
                  ),
                  updatedAt: Date.now(),
                }
              : log
          ),
        }));
      },
      
      deleteIssue: (logId, issueId) => {
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  issues: (log.issues || []).filter((issue) => issue.id !== issueId),
                  updatedAt: Date.now(),
                }
              : log
          ),
        }));
      },
      
      resolveIssue: (logId, issueId, resolvedBy, actionTaken) => {
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  issues: (log.issues || []).map((issue) =>
                    issue.id === issueId
                      ? {
                          ...issue,
                          status: 'Resolved' as IssueStatus,
                          resolvedBy,
                          resolvedAt: Date.now(),
                          actionTaken,
                          updatedAt: Date.now(),
                        }
                      : issue
                  ),
                  updatedAt: Date.now(),
                }
              : log
          ),
        }));
      },
      
      // Production Item Operations
      addProductionItem: (logId, item) => {
        const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newItem: ProductionItem = {
          ...item,
          id: itemId,
        };
        
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  productionItems: [...(log.productionItems || []), newItem],
                  updatedAt: Date.now(),
                }
              : log
          ),
        }));
      },
      
      updateProductionItem: (logId, itemId, updates) => {
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  productionItems: (log.productionItems || []).map((item) =>
                    item.id === itemId ? { ...item, ...updates } : item
                  ),
                  updatedAt: Date.now(),
                }
              : log
          ),
        }));
      },
      
      deleteProductionItem: (logId, itemId) => {
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logId
              ? {
                  ...log,
                  productionItems: (log.productionItems || []).filter((item) => item.id !== itemId),
                  updatedAt: Date.now(),
                }
              : log
          ),
        }));
      },
      
      // Issue Code Library Operations
      addIssueCode: (code) => {
        const id = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newCode: IssueCode = {
          ...code,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          issueCodes: [...state.issueCodes, newCode],
        }));
      },
      
      updateIssueCode: (id, updates) => {
        set((state) => ({
          issueCodes: state.issueCodes.map((code) =>
            code.id === id
              ? { ...code, ...updates, updatedAt: Date.now() }
              : code
          ),
        }));
      },
      
      deleteIssueCode: (id) => {
        set((state) => ({
          issueCodes: state.issueCodes.filter((code) => code.id !== id),
        }));
      },
      
      getIssueCodeByCode: (code) => {
        return get().issueCodes.find((ic) => ic.code === code);
      },
      
      getIssueCodesByDepartment: (department) => {
        if (!department) {
          return get().issueCodes;
        }
        return get().issueCodes.filter(
          (code) => !code.department || code.department === department
        );
      },
      
      // Department Operations
      addDepartment: (name) => {
        const id = `dept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newDept: Department = {
          id,
          name,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          departments: [...state.departments, newDept],
        }));
      },
      
      toggleDepartmentActive: (id) => {
        set((state) => ({
          departments: state.departments.map((dept) =>
            dept.id === id
              ? { ...dept, isActive: !dept.isActive, updatedAt: Date.now() }
              : dept
          ),
        }));
      },
      
      getActiveDepartments: () => {
        return get().departments.filter((dept) => dept.isActive);
      },
      
      // Analytics/Metrics
      getMetrics: (department, startDate, endDate) => {
        const logs = get().getLogsByDateRange(startDate, endDate, department);
        
        const totalLogs = logs.length;
        const allIssues = logs.flatMap((log) => log.issues || []);
        const totalIssues = allIssues.length;
        
        // Issues by status
        const issuesByStatus: Record<IssueStatus, number> = {
          'Open': 0,
          'In Progress': 0,
          'Resolved': 0,
          'Deferred': 0,
          'Rejected': 0,
        };
        
        allIssues.forEach((issue) => {
          if (issue) issuesByStatus[issue.status]++;
        });
        
        // Issues by severity
        const issuesBySeverity: Record<IssueSeverity, number> = {
          'Critical': 0,
          'Major': 0,
          'Minor': 0,
          'Observation': 0,
        };
        
        allIssues.forEach((issue) => {
          if (issue) issuesBySeverity[issue.severity]++;
        });
        
        // Issues by code
        const codeCount: Record<number, { title: string; count: number }> = {};
        allIssues.forEach((issue) => {
          if (issue && issue.issueCode) {
            if (!codeCount[issue.issueCode]) {
              codeCount[issue.issueCode] = { title: issue.issueTitle, count: 0 };
            }
            codeCount[issue.issueCode].count++;
          }
        });
        
        const issuesByCode = Object.entries(codeCount)
          .map(([code, data]) => ({
            code: parseInt(code),
            title: data.title,
            count: data.count,
          }))
          .sort((a, b) => b.count - a.count);
        
        // Calculate metrics
        const averageIssuesPerLog = totalLogs > 0 ? totalIssues / totalLogs : 0;
        const criticalIssueCount = issuesBySeverity['Critical'];
        const resolutionRate = totalIssues > 0
          ? (issuesByStatus['Resolved'] / totalIssues) * 100
          : 0;
        
        return {
          department,
          startDate,
          endDate,
          totalLogs,
          totalIssues,
          issuesByStatus,
          issuesBySeverity,
          issuesByCode,
          averageIssuesPerLog,
          criticalIssueCount,
          resolutionRate,
        };
      },
      
      // Utility
      clearAllData: () => {
        set({
          logs: [],
          issueCodes: [],
          departments: [],
        });
      },
      
      initializeDefaultData: () => {
        const state = get();
        
        // Initialize departments if none exist
        if (state.departments.length === 0) {
          const defaultDepartments: DepartmentType[] = ['Flexicore', 'Wall Panels', 'Extruded', 'Precast'];
          defaultDepartments.forEach((name) => {
            state.addDepartment(name);
          });
        }
        
        // Initialize common issue codes if none exist
        if (state.issueCodes.length === 0) {
          const defaultCodes = [
            { 
              code: 101, 
              title: 'Concrete Segregation', 
              severity: 'Major' as IssueSeverity, 
              description: 'Separation of coarse aggregates from concrete mix',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Stadia', 'Columns', 'Wall Panels', 'Stairs'] as any[]
            },
            { 
              code: 102, 
              title: 'Surface Defects', 
              severity: 'Minor' as IssueSeverity, 
              description: 'Minor surface imperfections or blemishes',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Stadia', 'Columns', 'Wall Panels', 'Stairs'] as any[]
            },
            { 
              code: 103, 
              title: 'Honeycomb', 
              severity: 'Critical' as IssueSeverity, 
              description: 'Voids in concrete due to incomplete consolidation',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Columns', 'Wall Panels'] as any[]
            },
            { 
              code: 201, 
              title: 'Dimensional Variance', 
              severity: 'Major' as IssueSeverity, 
              description: 'Product dimensions outside tolerance',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Stadia', 'Columns', 'Wall Panels', 'Stairs'] as any[]
            },
            { 
              code: 202, 
              title: 'Cracking', 
              severity: 'Critical' as IssueSeverity, 
              description: 'Structural or surface cracks in product',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Stadia', 'Columns', 'Wall Panels', 'Stairs'] as any[]
            },
            { 
              code: 203, 
              title: 'Spalling', 
              severity: 'Major' as IssueSeverity, 
              description: 'Flaking or chipping of concrete surface',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Columns', 'Wall Panels'] as any[]
            },
            { 
              code: 301, 
              title: 'Color Variation', 
              severity: 'Minor' as IssueSeverity, 
              description: 'Inconsistent coloring in finished product',
              applicableProducts: ['Wall Panels'] as any[]
            },
            { 
              code: 302, 
              title: 'Embedded Items Misplaced', 
              severity: 'Major' as IssueSeverity, 
              description: 'Inserts, anchors, or embeds not in correct position',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Columns', 'Wall Panels'] as any[]
            },
            { 
              code: 401, 
              title: 'Form Damage', 
              severity: 'Observation' as IssueSeverity, 
              description: 'Mold or form showing signs of wear or damage',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Stadia', 'Columns', 'Wall Panels', 'Stairs'] as any[]
            },
            { 
              code: 402, 
              title: 'Release Agent Issue', 
              severity: 'Minor' as IssueSeverity, 
              description: 'Problem with form release application',
              applicableProducts: ['Beams', 'Hollow Core Slabs', 'Solid Slabs', 'Stadia', 'Columns', 'Wall Panels', 'Stairs'] as any[]
            },
          ];
          
          defaultCodes.forEach((codeData) => {
            state.addIssueCode(codeData);
          });
        }
      },
    }),
    {
      name: 'quality-log-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

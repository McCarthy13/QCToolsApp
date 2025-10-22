import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, ProjectInput } from '../types/project-library';

interface ProjectLibraryState {
  projects: Project[];
  addProject: (project: ProjectInput) => void;
  updateProject: (id: string, project: Partial<ProjectInput>) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  searchProjects: (query: string) => Project[];
  exportProjects: () => string;
  importProjects: (jsonData: string) => { success: boolean; message: string; imported: number };
  clearAllProjects: () => void;
}

export const useProjectLibraryStore = create<ProjectLibraryState>()(
  persist(
    (set, get) => ({
      projects: [],

      addProject: (projectInput) => {
        const newProject: Project = {
          ...projectInput,
          id: `project-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          projects: [...state.projects, newProject],
        }));
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, ...updates, updatedAt: Date.now() }
              : project
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
        }));
      },

      getProjectById: (id) => {
        return get().projects.find((project) => project.id === id);
      },

      searchProjects: (query) => {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return get().projects;

        return get().projects.filter(
          (project) =>
            project.jobNumber.toLowerCase().includes(lowerQuery) ||
            project.jobName.toLowerCase().includes(lowerQuery)
        );
      },

      exportProjects: () => {
        const projects = get().projects;
        return JSON.stringify(projects, null, 2);
      },

      importProjects: (jsonData) => {
        try {
          const importedProjects = JSON.parse(jsonData) as Project[];
          
          // Validate that it's an array
          if (!Array.isArray(importedProjects)) {
            return { success: false, message: "Invalid format: Expected an array of projects", imported: 0 };
          }

          // Validate each project has required fields
          for (const project of importedProjects) {
            if (!project.jobNumber || !project.jobName) {
              return { success: false, message: "Invalid project data: Missing required fields", imported: 0 };
            }
          }

          const currentProjects = get().projects;
          const existingJobNumbers = new Set(currentProjects.map(p => p.jobNumber));
          
          // Filter out projects that already exist (by job number)
          const newProjects = importedProjects.filter(p => !existingJobNumbers.has(p.jobNumber));
          
          if (newProjects.length === 0) {
            return { success: true, message: "All projects already exist", imported: 0 };
          }

          // Add new projects with updated timestamps and IDs
          const projectsToAdd = newProjects.map(project => ({
            ...project,
            id: `project-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          set((state) => ({
            projects: [...state.projects, ...projectsToAdd],
          }));

          return { 
            success: true, 
            message: `Successfully imported ${newProjects.length} project(s)`, 
            imported: newProjects.length 
          };
        } catch (error) {
          return { success: false, message: `Import failed: ${error}`, imported: 0 };
        }
      },

      clearAllProjects: () => {
        set({ projects: [] });
      },
    }),
    {
      name: 'project-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

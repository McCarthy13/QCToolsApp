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
    }),
    {
      name: 'project-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

import { create } from 'zustand';
import { FirebaseSync } from '../services/firebaseSync';
import { Project, ProjectInput } from '../types/project-library';

interface ProjectLibraryState {
  projects: Project[];
  loading: boolean;
  initialized: boolean;
  addProject: (project: ProjectInput) => Promise<void>;
  updateProject: (id: string, project: Partial<ProjectInput>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
  searchProjects: (query: string) => Project[];
  exportProjects: () => string;
  importProjects: (jsonData: string) => { success: boolean; message: string; imported: number };
  clearAllProjects: () => Promise<void>;
  initialize: () => Promise<void>;
}

const firebaseSync = new FirebaseSync<Project>('projects');

export const useProjectLibraryStore = create<ProjectLibraryState>()((set, get) => ({
  projects: [],
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    try {
      const projects = await firebaseSync.fetchAll();
      set({ projects, loading: false, initialized: true });

      firebaseSync.subscribe((updatedProjects) => {
        set({ projects: updatedProjects });
      });
    } catch (error) {
      console.error('Failed to initialize projects:', error);
      set({ loading: false, initialized: true });
    }
  },

  addProject: async (projectInput) => {
    const newProject: Project = {
      ...projectInput,
      id: `project-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      projects: [...state.projects, newProject],
    }));

    try {
      await firebaseSync.set(newProject.id, newProject);
    } catch (error) {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== newProject.id),
      }));
      throw error;
    }
  },

  updateProject: async (id, updates) => {
    const oldProject = get().projects.find((p) => p.id === id);
    if (!oldProject) return;

    const updatedProject = { ...oldProject, ...updates, updatedAt: Date.now() };

    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? updatedProject : project
      ),
    }));

    try {
      await firebaseSync.set(id, updatedProject);
    } catch (error) {
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? oldProject : p)),
      }));
      throw error;
    }
  },

  deleteProject: async (id) => {
    const oldProject = get().projects.find((p) => p.id === id);

    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }));

    try {
      await firebaseSync.delete(id);
    } catch (error) {
      if (oldProject) {
        set((state) => ({
          projects: [...state.projects, oldProject],
        }));
      }
      throw error;
    }
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

  importProjects: (jsonData: string) => {
    try {
      const importedProjects = JSON.parse(jsonData) as Project[];

      if (!Array.isArray(importedProjects)) {
        return { success: false, message: "Invalid format: Expected an array of projects", imported: 0 };
      }

      for (const project of importedProjects) {
        if (!project.jobNumber || !project.jobName) {
          return { success: false, message: "Invalid project data: Missing required fields", imported: 0 };
        }
      }

      const currentProjects = get().projects;
      const existingJobNumbers = new Set(currentProjects.map(p => p.jobNumber));

      const newProjects = importedProjects.filter(p => !existingJobNumbers.has(p.jobNumber));

      if (newProjects.length === 0) {
        return { success: true, message: "All projects already exist", imported: 0 };
      }

      const projectsToAdd = newProjects.map(project => ({
        ...project,
        id: `project-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      // Add to Firebase
      Promise.all(projectsToAdd.map(p => firebaseSync.set(p.id, p))).catch(err =>
        console.error('Failed to sync imported projects to Firebase:', err)
      );

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

  clearAllProjects: async () => {
    const oldProjects = get().projects;

    set({ projects: [] });

    try {
      await Promise.all(oldProjects.map(p => firebaseSync.delete(p.id)));
    } catch (error) {
      set({ projects: oldProjects });
      throw error;
    }
  },
}));

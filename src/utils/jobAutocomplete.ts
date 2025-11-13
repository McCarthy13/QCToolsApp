import { useCallback } from 'react';
import { useProjectLibraryStore } from '../state/projectLibraryStore';
import { Project } from '../types/project-library';

export interface JobSuggestion {
  jobNumber: string;
  jobName: string;
  project: Project;
}

/**
 * Hook to provide job number/name auto-population functionality
 */
export function useJobAutocomplete() {
  const projects = useProjectLibraryStore((s) => s.projects);

  /**
   * Find project by exact job number match
   */
  const findByJobNumber = useCallback((jobNumber: string): Project | null => {
    const trimmed = jobNumber.trim();
    if (!trimmed) return null;
    
    return projects.find(p => p.jobNumber.toLowerCase() === trimmed.toLowerCase()) || null;
  }, [projects]);

  /**
   * Find project by exact job name match
   */
  const findByJobName = useCallback((jobName: string): Project | null => {
    const trimmed = jobName.trim();
    if (!trimmed) return null;
    
    return projects.find(p => p.jobName.toLowerCase() === trimmed.toLowerCase()) || null;
  }, [projects]);

  /**
   * Search for projects by partial job name match
   * Returns array of matching projects sorted by relevance
   */
  const searchByJobName = useCallback((query: string): JobSuggestion[] => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) return [];

    const matches = projects
      .filter(p => p.jobName.toLowerCase().includes(trimmed))
      .map(project => ({
        jobNumber: project.jobNumber,
        jobName: project.jobName,
        project,
      }));

    // Sort by: exact match first, then starts-with, then contains
    return matches.sort((a, b) => {
      const aLower = a.jobName.toLowerCase();
      const bLower = b.jobName.toLowerCase();
      
      if (aLower === trimmed && bLower !== trimmed) return -1;
      if (bLower === trimmed && aLower !== trimmed) return 1;
      if (aLower.startsWith(trimmed) && !bLower.startsWith(trimmed)) return -1;
      if (bLower.startsWith(trimmed) && !aLower.startsWith(trimmed)) return 1;
      
      return a.jobName.localeCompare(b.jobName);
    });
  }, [projects]);

  /**
   * Search for projects by partial job number match
   */
  const searchByJobNumber = useCallback((query: string): JobSuggestion[] => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    return projects
      .filter(p => p.jobNumber.toLowerCase().includes(trimmed))
      .map(project => ({
        jobNumber: project.jobNumber,
        jobName: project.jobName,
        project,
      }))
      .sort((a, b) => a.jobNumber.localeCompare(b.jobNumber));
  }, [projects]);

  return {
    findByJobNumber,
    findByJobName,
    searchByJobName,
    searchByJobNumber,
  };
}

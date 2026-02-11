import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { YardLocation, YardedPiece, YardSearchFilters } from '../types/yard-location';
import { PourDepartment } from '../types/pour-schedule';

interface YardLocationState {
  // Data
  yardLocations: YardLocation[];
  yardedPieces: YardedPiece[];

  // Yard Location Operations
  addYardLocation: (location: Omit<YardLocation, 'id'>) => string;
  updateYardLocation: (id: string, updates: Partial<YardLocation>) => void;
  deleteYardLocation: (id: string) => void;
  getYardLocation: (id: string) => YardLocation | undefined;
  getAllActiveYardLocations: () => YardLocation[];

  // Yarded Piece Operations
  addYardedPiece: (piece: Omit<YardedPiece, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateYardedPiece: (id: string, updates: Partial<YardedPiece>) => void;
  deleteYardedPiece: (id: string) => void;
  getYardedPiece: (id: string) => YardedPiece | undefined;
  getYardedPieceByPourEntryId: (pourEntryId: string) => YardedPiece | undefined;

  // Query Operations
  getYardedPiecesByLocation: (locationId: string) => YardedPiece[];
  getYardedPiecesByDepartment: (department: PourDepartment) => YardedPiece[];
  getYardedPiecesByJobNumber: (jobNumber: string) => YardedPiece[];
  searchYardedPieces: (filters: YardSearchFilters) => YardedPiece[];

  // Ship Operations
  markAsShipped: (pieceId: string, shippedBy: string) => void;
  markAsUnshipped: (pieceId: string) => void;

  // Utility
  clearAllData: () => void;
  initializeDefaultLocations: () => void;
}

export const useYardLocationStore = create<YardLocationState>()(
  persist(
    (set, get) => ({
      yardLocations: [],
      yardedPieces: [],

      // Yard Location Operations
      addYardLocation: (location) => {
        const id = `location-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newLocation: YardLocation = {
          ...location,
          id,
        };

        set((state) => ({
          yardLocations: [...state.yardLocations, newLocation],
        }));

        return id;
      },

      updateYardLocation: (id, updates) => {
        set((state) => ({
          yardLocations: state.yardLocations.map((location) =>
            location.id === id ? { ...location, ...updates } : location
          ),
        }));
      },

      deleteYardLocation: (id) => {
        set((state) => ({
          yardLocations: state.yardLocations.filter((location) => location.id !== id),
        }));
      },

      getYardLocation: (id) => {
        return get().yardLocations.find((location) => location.id === id);
      },

      getAllActiveYardLocations: () => {
        return get().yardLocations
          .filter((location) => location.isActive)
          .sort((a, b) => a.name.localeCompare(b.name));
      },

      // Yarded Piece Operations
      addYardedPiece: (piece) => {
        const id = `yarded-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newPiece: YardedPiece = {
          ...piece,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          yardedPieces: [...state.yardedPieces, newPiece],
        }));

        return id;
      },

      updateYardedPiece: (id, updates) => {
        set((state) => ({
          yardedPieces: state.yardedPieces.map((piece) =>
            piece.id === id
              ? { ...piece, ...updates, updatedAt: Date.now() }
              : piece
          ),
        }));
      },

      deleteYardedPiece: (id) => {
        set((state) => ({
          yardedPieces: state.yardedPieces.filter((piece) => piece.id !== id),
        }));
      },

      getYardedPiece: (id) => {
        return get().yardedPieces.find((piece) => piece.id === id);
      },

      getYardedPieceByPourEntryId: (pourEntryId) => {
        return get().yardedPieces.find((piece) => piece.pourEntryId === pourEntryId);
      },

      // Query Operations
      getYardedPiecesByLocation: (locationId) => {
        return get().yardedPieces
          .filter((piece) => piece.yardLocationId === locationId && !piece.isShipped)
          .sort((a, b) => b.yardedDate - a.yardedDate);
      },

      getYardedPiecesByDepartment: (department) => {
        return get().yardedPieces
          .filter((piece) => piece.department === department && !piece.isShipped)
          .sort((a, b) => b.yardedDate - a.yardedDate);
      },

      getYardedPiecesByJobNumber: (jobNumber) => {
        return get().yardedPieces
          .filter((piece) => piece.jobNumber === jobNumber)
          .sort((a, b) => b.yardedDate - a.yardedDate);
      },

      searchYardedPieces: (filters) => {
        let pieces = get().yardedPieces;

        // Filter by shipped status
        if (!filters.includeShipped) {
          pieces = pieces.filter((piece) => !piece.isShipped);
        }

        // Filter by department
        if (filters.department) {
          pieces = pieces.filter((piece) => piece.department === filters.department);
        }

        // Filter by job number
        if (filters.jobNumber) {
          const query = filters.jobNumber.toLowerCase();
          pieces = pieces.filter((piece) =>
            piece.jobNumber.toLowerCase().includes(query) ||
            piece.jobName?.toLowerCase().includes(query)
          );
        }

        // Filter by crane bay
        if (filters.craneBay) {
          pieces = pieces.filter((piece) => {
            const location = get().getYardLocation(piece.yardLocationId);
            return location?.craneBay === filters.craneBay;
          });
        }

        // Filter by date range
        if (filters.dateRange) {
          pieces = pieces.filter((piece) =>
            piece.pourDate >= filters.dateRange!.start &&
            piece.pourDate <= filters.dateRange!.end
          );
        }

        return pieces.sort((a, b) => b.yardedDate - a.yardedDate);
      },

      // Ship Operations
      markAsShipped: (pieceId, shippedBy) => {
        set((state) => ({
          yardedPieces: state.yardedPieces.map((piece) =>
            piece.id === pieceId
              ? {
                  ...piece,
                  isShipped: true,
                  shippedDate: Date.now(),
                  shippedBy,
                  updatedAt: Date.now(),
                }
              : piece
          ),
        }));
      },

      markAsUnshipped: (pieceId) => {
        set((state) => ({
          yardedPieces: state.yardedPieces.map((piece) =>
            piece.id === pieceId
              ? {
                  ...piece,
                  isShipped: false,
                  shippedDate: undefined,
                  shippedBy: undefined,
                  updatedAt: Date.now(),
                }
              : piece
          ),
        }));
      },

      // Utility
      clearAllData: () => {
        set({
          yardLocations: [],
          yardedPieces: [],
        });
      },

      initializeDefaultLocations: () => {
        const state = get();

        if (state.yardLocations.length === 0) {
          // Add some default yard locations as examples
          const craneBays = ['Crane Bay 1', 'Crane Bay 2', 'Crane Bay 3'];

          craneBays.forEach((bay) => {
            state.addYardLocation({
              name: bay,
              craneBay: bay,
              isActive: true,
            });
          });
        }
      },
    }),
    {
      name: 'yard-location-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

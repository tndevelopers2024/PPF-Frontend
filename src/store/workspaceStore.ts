import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  // Tool state
  activeTool: 'select' | 'pan' | 'nest' | 'cut';
  setActiveTool: (tool: 'select' | 'pan' | 'nest' | 'cut') => void;

  // View state
  zoom: number;
  setZoom: (zoom: number) => void;

  // Selection state
  selectedObjectIds: string[];
  setSelectedObjectIds: (ids: string[]) => void;

  // Film Settings
  filmWidth: number; // in mm (e.g., 60 inches = 1524 mm)
  setFilmWidth: (width: number) => void;

  // Patterns queued from vehicle detail page
  selectedPatternIds: string[];
  vehicleId: string | null;
  setQueuedPatterns: (patternIds: string[], vehicleId: string) => void;
  clearQueuedPatterns: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeTool: 'select',
      setActiveTool: (tool) => set({ activeTool: tool }),

      zoom: 1,
      setZoom: (zoom) => set({ zoom }),

      selectedObjectIds: [],
      setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),

      filmWidth: 1524,
      setFilmWidth: (width) => set({ filmWidth: width }),

      selectedPatternIds: [],
      vehicleId: null,
      setQueuedPatterns: (patternIds, vehicleId) => set({ selectedPatternIds: patternIds, vehicleId }),
      clearQueuedPatterns: () => set({ selectedPatternIds: [], vehicleId: null }),
    }),
    {
      name: 'ppf-workspace-storage',
    }
  )
);

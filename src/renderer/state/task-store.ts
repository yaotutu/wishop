import { create } from 'zustand';

export type TaskTarget = 'local' | 'cloud';

interface TaskUiState {
  runningTaskIds: string[];
  preferredTarget: TaskTarget;
  setPreferredTarget: (target: TaskTarget) => void;
  markRunning: (taskId: string) => void;
  markFinished: (taskId: string) => void;
}

export const useTaskStore = create<TaskUiState>((set) => ({
  runningTaskIds: [],
  preferredTarget: 'local',
  setPreferredTarget: (preferredTarget) => set({ preferredTarget }),
  markRunning: (taskId) => set(state => ({
    runningTaskIds: state.runningTaskIds.includes(taskId)
      ? state.runningTaskIds
      : [...state.runningTaskIds, taskId],
  })),
  markFinished: (taskId) => set(state => ({
    runningTaskIds: state.runningTaskIds.filter(id => id !== taskId),
  })),
}));


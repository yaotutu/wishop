import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export type AppModule =
  | 'orders'
  | 'storeManagement'
  | 'commonFunctions'
  | 'scheduledJobs'
  | 'violation'
  | 'settings';

export type SettingsTab = 'about' | 'product' | 'license' | 'automation' | 'sync' | 'contact';

export interface AppState {
  activeModule: AppModule;
  settingsTab?: SettingsTab;
  cloudPanelOpen: boolean;
  setActiveModule: (module: AppModule) => void;
  setSettingsTab: (tab?: SettingsTab) => void;
  setCloudPanelOpen: (open: boolean) => void;
}

export function createAppStore(initial?: Partial<Pick<AppState, 'activeModule' | 'settingsTab' | 'cloudPanelOpen'>>) {
  return createStore<AppState>()((set) => ({
    activeModule: initial?.activeModule || 'orders',
    settingsTab: initial?.settingsTab,
    cloudPanelOpen: initial?.cloudPanelOpen || false,
    setActiveModule: (activeModule) => set({ activeModule }),
    setSettingsTab: (settingsTab) => set({ settingsTab }),
    setCloudPanelOpen: (cloudPanelOpen) => set({ cloudPanelOpen }),
  }));
}

export const appStore = createAppStore();

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}


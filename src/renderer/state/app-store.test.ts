import { describe, expect, it } from 'vitest';
import { createAppStore } from './app-store';

describe('app zustand store', () => {
  it('tracks current module and cloud panel state without redux', () => {
    const store = createAppStore();

    store.getState().setActiveModule('settings');
    store.getState().setSettingsTab('sync');
    store.getState().setCloudPanelOpen(true);

    expect(store.getState()).toMatchObject({
      activeModule: 'settings',
      settingsTab: 'sync',
      cloudPanelOpen: true,
    });
  });
});

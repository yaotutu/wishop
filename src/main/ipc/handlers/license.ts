import { ipcMain } from 'electron';
import { getLicenseState, setLicenseState } from '../../store';
import type { LicenseActivationInput, LicenseState } from '../../../shared/types';

export function registerLicenseHandlers(): void {
  ipcMain.handle('license:get', (): LicenseState => {
    return getLicenseState();
  });

  ipcMain.handle('license:activate', (_, input: LicenseActivationInput): LicenseState => {
    const licenseKey = input.licenseKey.trim();
    if (!licenseKey) throw new Error('请输入激活码');
    return setLicenseState({
      licenseKey,
      status: 'active',
      plan: 'paid',
      activatedAt: Date.now(),
      checkedAt: Date.now(),
      lastError: undefined,
      enforcementEnabled: false,
    });
  });

  ipcMain.handle('license:refresh', (): LicenseState => {
    const state = getLicenseState();
    return setLicenseState({
      checkedAt: Date.now(),
      status: state.licenseKey ? state.status : 'inactive',
      lastError: undefined,
      enforcementEnabled: false,
    });
  });

  ipcMain.handle('license:clear', (): LicenseState => {
    return setLicenseState({
      licenseKey: undefined,
      status: 'inactive',
      plan: 'none',
      activatedAt: undefined,
      expiresAt: undefined,
      checkedAt: Date.now(),
      lastError: undefined,
      enforcementEnabled: false,
    });
  });
}

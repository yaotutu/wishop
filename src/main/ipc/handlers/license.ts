import { ipcMain } from 'electron';
import type { LicenseActivationInput } from '../../../shared/types';
import { activateLicense, clearLicense, getEntitlement, refreshLicense } from '../../licensing/licensing-service';

export function registerLicenseHandlers(): void {
  ipcMain.handle('license:get', async () => getEntitlement());
  ipcMain.handle('license:activate', async (_, input: LicenseActivationInput) => activateLicense(input));
  ipcMain.handle('license:refresh', async () => refreshLicense());
  ipcMain.handle('license:clear', async () => clearLicense());
}

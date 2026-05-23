import { ipcMain } from 'electron';
import { z } from 'zod';
import { credentialPlatformSchema, credentialScopeSchema, type CredentialMeta } from '../../../shared/credentials';
import {
  authorizeCredentialMetaForCloud,
  getCredentialMetas,
  revokeCredentialMetaCloudAuthorization,
  saveLocalCredentialMeta,
} from '../../store';
import { cloudRuntime } from '../../services/cloud-sync-service';

const saveCredentialSchema = z.object({
  accountId: z.string().min(1),
  platform: credentialPlatformSchema,
  scope: z.array(credentialScopeSchema).min(1),
});

export function registerCredentialHandlers(): void {
  ipcMain.handle('credentials:getMeta', (_, accountId?: string): CredentialMeta[] => {
    return getCredentialMetas(accountId);
  });

  ipcMain.handle('credentials:saveLocal', (_, input: unknown): CredentialMeta => {
    return saveLocalCredentialMeta(saveCredentialSchema.parse(input));
  });

  ipcMain.handle('credentials:authorizeCloud', (_, credentialId: string): CredentialMeta => {
    return authorizeCredentialMetaForCloud(z.string().min(1).parse(credentialId));
  });

  ipcMain.handle('credentials:revokeCloud', (_, credentialId: string): CredentialMeta => {
    return revokeCredentialMetaCloudAuthorization(z.string().min(1).parse(credentialId));
  });

  ipcMain.handle('credentials:getCloudStatus', async (_, credentialId: string) => {
    return cloudRuntime.credentials.getStatus(z.string().min(1).parse(credentialId));
  });
}


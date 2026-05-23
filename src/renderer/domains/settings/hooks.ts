import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Account, LicenseState } from '../../../shared/types';
import type { AppSettings } from '../../../shared/settings';
import { DEFAULT_APP_SETTINGS } from '../../../shared/settings';
import type { CredentialMeta } from '../../../shared/credentials';
import type { SyncModuleKey, SyncModuleSetting, SyncSettings } from '../../../shared/sync';
import { accountsClient } from '../accounts/client';
import { cloudClient } from '../cloud/client';
import { settingsClient } from './client';

const licenseKey = ['settings', 'license'];
const appSettingsKey = ['settings', 'appSettings'];
const syncSettingsKey = ['settings', 'sync'];
const cloudCapabilitiesKey = ['cloud', 'capabilities'];
const accountsKey = ['accounts'];
const credentialMetasKey = ['settings', 'credentialMetas'];

export function useLicenseSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: licenseKey,
    queryFn: () => settingsClient.license.get(),
  });
  const activateMutation = useMutation({
    mutationFn: (licenseKeyValue: string) => settingsClient.license.activate({ licenseKey: licenseKeyValue }),
    onSuccess: license => queryClient.setQueryData<LicenseState>(licenseKey, license),
  });
  const clearMutation = useMutation({
    mutationFn: () => settingsClient.license.clear(),
    onSuccess: license => queryClient.setQueryData<LicenseState>(licenseKey, license),
  });

  return {
    license: query.data,
    loading: query.isLoading || activateMutation.isPending || clearMutation.isPending,
    activateLicense: (licenseKeyValue: string) => activateMutation.mutateAsync(licenseKeyValue),
    clearLicense: () => clearMutation.mutateAsync(),
  };
}

export function useAutomationSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: appSettingsKey,
    queryFn: () => settingsClient.appSettings.get(),
    initialData: DEFAULT_APP_SETTINGS,
  });
  const updateMutation = useMutation({
    mutationFn: (patch: Partial<AppSettings['shipmentCheck']>) =>
      settingsClient.appSettings.update({ shipmentCheck: patch }),
    onSuccess: settings => queryClient.setQueryData<AppSettings>(appSettingsKey, settings),
  });

  return {
    settings: query.data || DEFAULT_APP_SETTINGS,
    loading: query.isLoading || updateMutation.isPending,
    updateShipmentCheck: (patch: Partial<AppSettings['shipmentCheck']>) => updateMutation.mutateAsync(patch),
  };
}

export function useCloudSyncSettings() {
  const queryClient = useQueryClient();
  const syncQuery = useQuery({
    queryKey: syncSettingsKey,
    queryFn: () => settingsClient.sync.getSettings(),
  });
  const cloudQuery = useQuery({
    queryKey: cloudCapabilitiesKey,
    queryFn: () => cloudClient.getCapabilities(),
  });
  const accountsQuery = useQuery<Account[]>({
    queryKey: accountsKey,
    queryFn: () => accountsClient.list(),
    initialData: [],
  });
  const credentialsQuery = useQuery<CredentialMeta[]>({
    queryKey: credentialMetasKey,
    queryFn: () => settingsClient.credentials.getMeta(),
    initialData: [],
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ module, patch }: { module: SyncModuleKey; patch: Partial<SyncModuleSetting> }) =>
      settingsClient.sync.updateModuleSetting(module, patch),
    onSuccess: settings => queryClient.setQueryData<SyncSettings>(syncSettingsKey, settings),
  });
  const saveCredentialMutation = useMutation({
    mutationFn: async () => {
      const account = accountsQuery.data?.[0];
      if (!account) throw new Error('请先创建店铺账号');
      const meta = await settingsClient.credentials.saveLocal({
        accountId: account.id,
        platform: 'wechat-shop',
        scope: ['api', 'cloud-task'],
      });
      return settingsClient.credentials.authorizeCloud(meta.credentialId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: credentialMetasKey }),
  });
  const revokeCredentialMutation = useMutation({
    mutationFn: (credentialId: string) => settingsClient.credentials.revokeCloud(credentialId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: credentialMetasKey }),
  });

  return {
    syncSettings: syncQuery.data,
    cloudCapabilities: cloudQuery.data,
    accounts: accountsQuery.data || [],
    credentials: credentialsQuery.data || [],
    syncLoading: syncQuery.isLoading || updateModuleMutation.isPending,
    updateModuleSetting: (module: SyncModuleKey, patch: Partial<SyncModuleSetting>) =>
      updateModuleMutation.mutateAsync({ module, patch }),
    saveCloudCredential: () => saveCredentialMutation.mutateAsync(),
    revokeCloudCredential: (credentialId: string) => revokeCredentialMutation.mutateAsync(credentialId),
    savingCredential: saveCredentialMutation.isPending,
    revokingCredential: revokeCredentialMutation.isPending,
  };
}

import { v4 as uuidv4 } from 'uuid';
import type { LicenseActivationInput, LicensedFeature, LicenseState } from '../../shared/types';
import { readStore, writeStore } from '../store';

function defaultLicenseState(): LicenseState {
  return {
    enforcementEnabled: false,
    status: 'inactive',
    plan: 'none',
    deviceId: uuidv4(),
  };
}

export async function getEntitlement(): Promise<LicenseState> {
  const stored = readStore().licenseState;
  const base = defaultLicenseState();
  return {
    ...base,
    ...stored,
    deviceId: stored?.deviceId || base.deviceId,
    enforcementEnabled: stored?.enforcementEnabled === true,
  };
}

async function setLicenseState(patch: Partial<LicenseState>): Promise<LicenseState> {
  const next = { ...(await getEntitlement()), ...patch };
  writeStore({ licenseState: next });
  return next;
}

export async function assertFeatureAccess(_feature: LicensedFeature): Promise<void> {
  const state = await getEntitlement();
  if (!state.enforcementEnabled) return;
  if (state.status !== 'active' && state.status !== 'grace') {
    throw new Error('当前授权不可用，请完成软件激活后继续使用');
  }
}

export async function activateLicense(input: LicenseActivationInput): Promise<LicenseState> {
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
}

export async function clearLicense(): Promise<LicenseState> {
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
}

export async function refreshLicense(): Promise<LicenseState> {
  const state = await getEntitlement();
  return setLicenseState({
    checkedAt: Date.now(),
    status: state.licenseKey ? state.status : 'inactive',
    lastError: undefined,
    enforcementEnabled: false,
  });
}

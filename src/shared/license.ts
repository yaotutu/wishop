export type LicensedFeature = 'orders' | 'listing' | 'violation' | 'shipping';

export interface LicenseActivationInput {
  licenseKey: string;
}

export interface LicenseState {
  enforcementEnabled: boolean;
  status: 'inactive' | 'active' | 'expired' | 'invalid' | 'grace';
  plan: 'none' | 'paid';
  licenseKey?: string;
  deviceId: string;
  activatedAt?: number;
  expiresAt?: number;
  checkedAt?: number;
  lastError?: string;
}

import type { LicenseState } from '../../../shared/license';

export interface LicenseRepositoryDeps {
  getLicenseState: () => LicenseState | undefined;
  setLicenseState: (state: LicenseState) => void;
  createId: () => string;
}

export function createLicenseRepository(deps: LicenseRepositoryDeps) {
  function createDefaultLicenseState(): LicenseState {
    const stored = deps.getLicenseState();
    return {
      enforcementEnabled: false,
      status: 'inactive',
      plan: 'none',
      deviceId: stored?.deviceId || deps.createId(),
    };
  }

  return {
    getLicenseState(): LicenseState {
      const stored = deps.getLicenseState();
      return {
        ...createDefaultLicenseState(),
        ...stored,
        enforcementEnabled: stored?.enforcementEnabled === true,
      };
    },

    setLicenseState(patch: Partial<LicenseState>): LicenseState {
      const next = { ...this.getLicenseState(), ...patch };
      deps.setLicenseState(next);
      return next;
    },
  };
}

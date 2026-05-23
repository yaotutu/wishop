import { describe, expect, it } from 'vitest';
import { createLicenseRepository } from './license-repository';
import type { LicenseState } from '../../../shared/license';

describe('license repository', () => {
  it('creates an inactive local license state by default', () => {
    let state: LicenseState | undefined;
    const repo = createLicenseRepository({
      getLicenseState: () => state,
      setLicenseState: next => { state = next; },
      createId: () => 'device-1',
    });

    expect(repo.getLicenseState()).toMatchObject({
      enforcementEnabled: false,
      status: 'inactive',
      plan: 'none',
      deviceId: 'device-1',
    });
  });

  it('preserves device id while patching license state', () => {
    let state: LicenseState | undefined = {
      enforcementEnabled: false,
      status: 'inactive',
      plan: 'none',
      deviceId: 'stored-device',
    };
    const repo = createLicenseRepository({
      getLicenseState: () => state,
      setLicenseState: next => { state = next; },
      createId: () => 'new-device',
    });

    const next = repo.setLicenseState({ status: 'active', plan: 'paid' });

    expect(next).toMatchObject({
      status: 'active',
      plan: 'paid',
      deviceId: 'stored-device',
    });
  });
});

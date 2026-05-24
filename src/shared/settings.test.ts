import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIPMENT_CHECK_SETTINGS, normalizeShipmentCheckSettings } from './settings';

describe('shipment check settings', () => {
  it('defaults automatic shipment checks to disabled', () => {
    expect(DEFAULT_SHIPMENT_CHECK_SETTINGS.enabled).toBe(false);
    expect(normalizeShipmentCheckSettings().enabled).toBe(false);
  });
});

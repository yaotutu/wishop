import { describe, expect, it } from 'vitest';

const { closeShippingAssistantWindows, registerShippingAssistantHandlers } = await import('./shipping-assistant-window');

describe('embedded shipping assistant compatibility hooks', () => {
  it('keeps legacy handler exports as no-ops for the embedded assistant', () => {
    expect(() => registerShippingAssistantHandlers()).not.toThrow();
    expect(() => closeShippingAssistantWindows()).not.toThrow();
  });
});

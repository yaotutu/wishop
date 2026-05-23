import { describe, expect, it, vi } from 'vitest';
import { browserClient } from './client';

describe('browserClient', () => {
  it('opens the shared Taobao browser inside the main window', async () => {
    const dispatchEvent = vi.fn((event: CustomEvent) => {
      event.detail.onReady();
      return true;
    });
    vi.stubGlobal('window', { dispatchEvent });

    await browserClient.openTaobaoBrowser();

    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'wishop:open-taobao-browser',
      detail: expect.objectContaining({
        profileId: 'baseline',
        url: 'https://www.taobao.com',
        onReady: expect.any(Function),
        onError: expect.any(Function),
      }),
    }));
  });
});

import type { WishopAPI } from '../preload';

declare global {
  interface Window {
    wishop: WishopAPI;
    appVersion: {
      get: () => Promise<string>;
    };
    updater: {
      check: () => Promise<void>;
      onAvailable: (callback: (info: { version: string }) => void) => void;
      onProgress: (callback: (info: { percent: number }) => void) => void;
      onDownloaded: (callback: (info: { version: string }) => void) => void;
      onNotAvailable: (callback: () => void) => void;
      onError: (callback: (error: string) => void) => void;
      install: () => Promise<void>;
    };
  }
}

export {};

import type { WishopAPI } from '../preload';
import type React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
      };
    }
  }

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

function maskWebdriver(target: object | null | undefined): void {
  if (!target) return;
  try {
    Object.defineProperty(target, 'webdriver', {
      configurable: true,
      get: () => false,
    });
  } catch {
    // Keep the page usable if Electron exposes a locked navigator descriptor.
  }
}

(() => {
  const nav = (globalThis as { navigator?: object }).navigator;
  maskWebdriver(nav ? Object.getPrototypeOf(nav) : undefined);
  maskWebdriver(nav);
})();

export {};

import type { Account, Config } from '../../../shared/types';

export const accountsClient = {
  list(): Promise<Account[]> {
    return window.wishop.accounts.list();
  },
  add(name: string, config: Config): Promise<Account> {
    return window.wishop.accounts.add(name, config);
  },
  remove(accountId: string): Promise<void> {
    return window.wishop.accounts.remove(accountId);
  },
  update(accountId: string, patch: Partial<Pick<Account, 'name' | 'config'>>): Promise<void> {
    return window.wishop.accounts.update(accountId, patch);
  },
  setActive(accountId: string): Promise<void> {
    return window.wishop.accounts.setActive(accountId);
  },
};

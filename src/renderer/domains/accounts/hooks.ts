import { useCallback, useState } from 'react';
import type { Account, Config } from '../../../shared/types';
import { accountsClient } from './client';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<string>('');

  const fetchAccounts = useCallback(async () => {
    const list = await accountsClient.list();
    setAccounts(list);
    setActiveAccountIdState(prev => prev || list[0]?.id || '');
  }, []);

  const addAccount = useCallback(async (name: string, config: Config): Promise<Account> => {
    const account = await accountsClient.add(name, config);
    await fetchAccounts();
    return account;
  }, [fetchAccounts]);

  const removeAccount = useCallback(async (id: string) => {
    await accountsClient.remove(id);
    await fetchAccounts();
  }, [fetchAccounts]);

  const updateAccount = useCallback(async (id: string, patch: Partial<Pick<Account, 'name' | 'config'>>) => {
    await accountsClient.update(id, patch);
    await fetchAccounts();
  }, [fetchAccounts]);

  const switchAccount = useCallback(async (id: string) => {
    await accountsClient.setActive(id);
    setActiveAccountIdState(id);
  }, []);

  return { accounts, activeAccountId, fetchAccounts, addAccount, removeAccount, updateAccount, switchAccount };
}

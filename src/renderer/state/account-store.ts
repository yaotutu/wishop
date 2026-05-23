import { create } from 'zustand';

interface AccountUiState {
  activeAccountId: string;
  setActiveAccountId: (accountId: string) => void;
}

export const useAccountStore = create<AccountUiState>((set) => ({
  activeAccountId: '',
  setActiveAccountId: (activeAccountId) => set({ activeAccountId }),
}));


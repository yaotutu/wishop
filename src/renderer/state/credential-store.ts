import { create } from 'zustand';

interface CredentialUiState {
  authorizationOpen: boolean;
  selectedCredentialId?: string;
  openAuthorization: (credentialId?: string) => void;
  closeAuthorization: () => void;
}

export const useCredentialStore = create<CredentialUiState>((set) => ({
  authorizationOpen: false,
  selectedCredentialId: undefined,
  openAuthorization: (selectedCredentialId) => set({ authorizationOpen: true, selectedCredentialId }),
  closeAuthorization: () => set({ authorizationOpen: false, selectedCredentialId: undefined }),
}));


import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionCredentials, SavedAccount } from '../types';
import { FileServiceFactory } from '../services/FileServiceFactory';

/**
 * Validate if credentials object is valid
 */
function isValidCredentials(credentials: any): credentials is ConnectionCredentials {
    if (!credentials || typeof credentials !== 'object') {
        return false;
    }

    const validProtocols = ['node-user', 'access-key', 'ssh'];
    if (!validProtocols.includes(credentials.protocol)) {
        return false;
    }

    // Validate protocol-specific fields
    if (credentials.protocol === 'ssh') {
        return !!(credentials.url && credentials.username && credentials.authMethod);
    } else {
        return !!(credentials.url && credentials.username && credentials.password !== undefined);
    }
}

/**
 * Validate and clean saved accounts
 */
function validateSavedAccounts(accounts: any[]): SavedAccount[] {
    if (!Array.isArray(accounts)) {
        return [];
    }

    const validAccounts = accounts.filter(account => {
        return account &&
            account.id &&
            account.name &&
            isValidCredentials(account.credentials);
    });

    return validAccounts;
}

interface AuthState {
    credentials: ConnectionCredentials;
    savedAccounts: SavedAccount[];
    currentAccountId: string | null;
    setCredentials: (credentials: ConnectionCredentials) => void;
    clearCredentials: () => void;
    addAccount: (account: SavedAccount) => void;
    removeAccount: (accountId: string) => void;
    selectAccount: (accountId: string) => void;
    disconnect: () => void;
}

const emptyCredentials: ConnectionCredentials = {
    protocol: 'node-user',
    url: '',
    username: '',
    password: '',
    useTokenAuth: false,
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            credentials: emptyCredentials,
            savedAccounts: [],
            currentAccountId: null,
            setCredentials: (credentials) => {
                // Validate credentials before setting
                if (!credentials || !credentials.protocol) {
                    console.error('Invalid credentials provided:', credentials);
                    return;
                }
                set({ credentials });
            },
            clearCredentials: () => set({ credentials: emptyCredentials, currentAccountId: null }),
            addAccount: (account) => set((state) => ({
                savedAccounts: [...state.savedAccounts.filter(a => a.id !== account.id), account]
            })),
            removeAccount: (accountId) => set((state) => ({
                savedAccounts: state.savedAccounts.filter(a => a.id !== accountId),
                currentAccountId: state.currentAccountId === accountId ? null : state.currentAccountId
            })),
            selectAccount: (accountId) => {
                const account = get().savedAccounts.find(a => a.id === accountId);
                if (account) {
                    // Validate credentials before setting
                    if (!account.credentials || !account.credentials.protocol) {
                        console.error('Invalid credentials in saved account:', account);
                        return;
                    }
                    set({
                        credentials: account.credentials,
                        currentAccountId: accountId
                    });
                }
            },
            disconnect: () => {
                FileServiceFactory.reset();
                set({
                    currentAccountId: null
                });
            },
        }),
        {
            name: 'aspera-auth-storage',
            partialize: (state) => ({
                credentials: state.credentials,
                savedAccounts: state.savedAccounts,
                currentAccountId: state.currentAccountId
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Validate and clean credentials
                    if (!isValidCredentials(state.credentials)) {
                        console.warn('Invalid credentials in storage, resetting to empty');
                        state.credentials = emptyCredentials;
                        state.currentAccountId = null;
                    }

                    // Validate and clean saved accounts
                    state.savedAccounts = validateSavedAccounts(state.savedAccounts);
                }
            },
        }
    )
);


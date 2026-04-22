import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionCredentials, SavedAccount } from '../types';
import { FileServiceFactory } from '../services/FileServiceFactory';

/**
 * Validate if credentials object is valid
 */
function isValidCredentials(credentials: unknown): credentials is ConnectionCredentials {
    if (!credentials || typeof credentials !== 'object') {
        return false;
    }

    const cred = credentials as Record<string, unknown>;
    const validAccessTypes = ['node-user', 'access-key', 'ssh'];
    if (!validAccessTypes.includes(cred.access_type as string)) {
        return false;
    }

    // Validate access_type-specific fields
    if (cred.access_type === 'ssh') {
        return !!(cred.url && cred.username && cred.authMethod);
    } else {
        return !!(cred.url && cred.username && cred.password !== undefined);
    }
}

/**
 * Validate and clean saved accounts
 */
function validateSavedAccounts(accounts: unknown[]): SavedAccount[] {
    if (!Array.isArray(accounts)) {
        return [];
    }

    const validAccounts = accounts.filter((account): account is SavedAccount => {
        if (!account || typeof account !== 'object') {
            return false;
        }
        const acc = account as Record<string, unknown>;
        return !!(acc.id &&
            acc.name &&
            isValidCredentials(acc.credentials));
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
    access_type: 'node-user',
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
                if (!credentials || !credentials.access_type) {
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
                    if (!account.credentials || !account.credentials.access_type) {
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


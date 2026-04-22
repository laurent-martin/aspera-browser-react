import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'light',
            toggleTheme: () =>
                set((state) => {
                    const newTheme = state.theme === 'light' ? 'dark' : 'light';
                    // Apply theme to document root
                    document.documentElement.setAttribute('data-theme', newTheme);
                    return { theme: newTheme };
                }),
            setTheme: (theme) => {
                // Apply theme to document root
                document.documentElement.setAttribute('data-theme', theme);
                set({ theme });
            },
        }),
        {
            name: 'aspera-theme-storage',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Apply saved theme on app load
                    document.documentElement.setAttribute('data-theme', state.theme);
                }
            },
        }
    )
);

// Made with Bob

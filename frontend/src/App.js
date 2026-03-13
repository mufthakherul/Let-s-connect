/**
 * App.js - Modular application shell
 * Phase 1 - Workstream B1: App shell modularization
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { designTokens } from './theme/designSystem';
import AppProviders from './providers/AppProviders';
import MainLayout from './layouts/MainLayout';
import AppRoutes from './routing/AppRoutes';

function AppContent() {
    const location = useLocation();
    const { mode, toggleTheme, getAccentColor, initSystemThemeListener, accessibility } = useThemeStore();
    const { user, logout } = useAuthStore();
    const [internalUser, setInternalUser] = useState(user);

    useEffect(() => {
        setInternalUser(user);
    }, [user]);

    useEffect(() => {
        const cleanup = initSystemThemeListener();
        return cleanup;
    }, [initSystemThemeListener]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [location.pathname]);

    const brandGradient = useMemo(
        () => `linear-gradient(135deg, ${designTokens.colors[mode].primary} 0%, ${designTokens.colors[mode].secondary} 100%)`,
        [mode]
    );

    const theme = useMemo(() => {
        const {
            textScale = 1,
            highContrast = false,
            fontFamily = 'default',
        } = accessibility || {};

        const accentColor = getAccentColor() || {
            primary: designTokens.colors[mode].primary,
            secondary: designTokens.colors[mode].secondary,
        };

        const normalizeColor = (value, fallback) => {
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
            if (value && typeof value === 'object' && typeof value.main === 'string' && value.main.trim()) {
                return value.main.trim();
            }
            return fallback;
        };

        const primaryColor = normalizeColor(
            highContrast ? (mode === 'dark' ? '#ffffff' : '#000000') : accentColor.primary,
            '#1976d2'
        );

        const secondaryColor = normalizeColor(
            highContrast ? (mode === 'dark' ? '#ffff00' : '#ff0000') : accentColor.secondary,
            '#dc004e'
        );

        const fontFamilyMap = {
            default: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            dyslexic: '"OpenDyslexic", "Inter", "Roboto", sans-serif',
            'high-legibility': '"Atkinson Hyperlegible", "Inter", "Roboto", sans-serif',
        };

        const palette = {
            mode,
            primary: {
                main: primaryColor,
                light: designTokens.colors[mode].primary + 'cc',
                dark: designTokens.colors[mode].primary,
            },
            secondary: {
                main: secondaryColor,
            },
            background: {
                default: highContrast ? (mode === 'dark' ? '#000' : '#fff') : designTokens.colors[mode].background,
                paper: highContrast ? (mode === 'dark' ? '#000' : '#fff') : designTokens.colors[mode].paper,
            },
            text: {
                primary: designTokens.colors[mode].text,
                secondary: designTokens.colors[mode].textSecondary,
            },
            divider: designTokens.colors[mode].border,
            success: { main: '#10b981' },
        };

        return createTheme({
            palette,
            typography: {
                fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.default,
                fontSize: 14 * textScale,
                h1: { ...designTokens.typography.h1, fontSize: `${2.2 * textScale}rem` },
                h2: { ...designTokens.typography.h2, fontSize: `${1.8 * textScale}rem` },
                button: designTokens.typography.button,
            },
            shape: { borderRadius: 12 },
            components: {
                MuiCssBaseline: {
                    styleOverrides: {
                        body: {
                            scrollbarWidth: 'thin',
                            '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                            '&::-webkit-scrollbar-thumb': {
                                background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                background: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                            },
                        },
                    },
                },
                MuiAppBar: {
                    styleOverrides: {
                        root: {
                            backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                            color: mode === 'dark' ? '#f8fafc' : '#0f172a',
                            backgroundImage: 'none',
                            boxShadow: 'none',
                            borderBottom: `1px solid ${designTokens.colors[mode].border}`,
                        },
                    },
                },
                MuiDrawer: {
                    styleOverrides: {
                        paper: {
                            backgroundImage: 'none',
                            borderRight: `1px solid ${designTokens.colors[mode].border}`,
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            borderRadius: 16,
                            border: `1px solid ${designTokens.colors[mode].border}`,
                            boxShadow: mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
                            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: mode === 'dark' ? '0 12px 30px rgba(0,0,0,0.6)' : '0 12px 30px rgba(0,0,0,0.12)',
                            },
                        },
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 10,
                            textTransform: 'none',
                            fontWeight: 600,
                            padding: '8px 20px',
                        },
                    },
                },
            },
        });
    }, [mode, accessibility, getAccentColor]);

    const handleLogout = () => {
        logout();
        setInternalUser(null);
    };

    return (
        <ThemeProvider theme={theme}>
            <MainLayout
                theme={theme}
                mode={mode}
                user={internalUser}
                setUser={setInternalUser}
                brandGradient={brandGradient}
                onLogout={handleLogout}
                onToggleTheme={toggleTheme}
                accessibility={accessibility || {}}
            >
                <AppRoutes user={internalUser} setUser={setInternalUser} />
            </MainLayout>
        </ThemeProvider>
    );
}

function App() {
    return (
        <AppProviders>
            <AppContent />
        </AppProviders>
    );
}

export default App;

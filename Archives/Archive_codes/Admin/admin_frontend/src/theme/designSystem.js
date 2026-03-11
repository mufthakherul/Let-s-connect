import { grey } from '@mui/material/colors';

/**
 * Premium Design System Tokens
 * Focused on: Glassmorphism, Modern Dark-Navy aesthetics, and high-readability typography.
 */

export const designTokens = {
    colors: {
        dark: {
            background: '#0a0f1e', // Deep Space Navy
            paper: 'rgba(15, 23, 42, 0.8)', // Translucent Paper
            primary: '#6366f1', // Vibrant Indigo
            secondary: '#ec4899', // Electric Pink
            accent: '#22d3ee', // Cyan glow
            text: '#f8fafc',
            textSecondary: '#94a3b8',
            border: 'rgba(255, 255, 255, 0.08)',
        },
        light: {
            background: '#f8fafc',
            paper: 'rgba(255, 255, 255, 0.8)',
            primary: '#4f46e5',
            secondary: '#db2777',
            accent: '#0891b2',
            text: '#0f172a',
            textSecondary: '#64748b',
            border: 'rgba(0, 0, 0, 0.05)',
        }
    },
    glassmorphism: {
        dark: {
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        },
        light: {
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(209, 213, 219, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        }
    },
    typography: {
        fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 800, letterSpacing: '-0.025em' },
        h2: { fontWeight: 700, letterSpacing: '-0.025em' },
        button: { textTransform: 'none', fontWeight: 600 },
    }
};

export const getGlassyStyle = (mode) => designTokens.glassmorphism[mode];

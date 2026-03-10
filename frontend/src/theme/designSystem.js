import { grey } from '@mui/material/colors';

/**
 * Design System 2.0 - Comprehensive Token Library
 * Workstream A1: Consolidate tokens for spacing, typography, radii, elevation, motion
 * Includes: Component variants, page templates, and standardized state patterns
 */

export const designTokens = {
    // Color system
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
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
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
            success: '#059669',
            warning: '#d97706',
            error: '#dc2626',
            info: '#2563eb',
        }
    },

    // Spacing scale (8px base unit)
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '80px',
        // Semantic spacing
        cardPadding: '24px',
        sectionGap: '48px',
        componentGap: '16px',
        inputPadding: '12px 16px',
    },

    // Border radius scale
    radii: {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
        // Component-specific
        card: '12px',
        button: '8px',
        input: '8px',
        modal: '16px',
        chip: '16px',
    },

    // Elevation/shadow system
    elevation: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        // Glowing shadows for dark mode
        glow: {
            primary: '0 0 20px rgba(99, 102, 241, 0.3)',
            secondary: '0 0 20px rgba(236, 72, 153, 0.3)',
            accent: '0 0 20px rgba(34, 211, 238, 0.3)',
        }
    },

    // Motion/animation system
    motion: {
        // Duration
        duration: {
            instant: '100ms',
            fast: '200ms',
            normal: '300ms',
            slow: '500ms',
            slower: '700ms',
        },
        // Easing curves
        easing: {
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
            spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        },
        // Common transitions
        transitions: {
            default: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
            fast: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
            slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
        }
    },

    // Glassmorphism variants
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

    // Typography system
    typography: {
        fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: {
            xs: '0.75rem',    // 12px
            sm: '0.875rem',   // 14px
            base: '1rem',     // 16px
            lg: '1.125rem',   // 18px
            xl: '1.25rem',    // 20px
            '2xl': '1.5rem',  // 24px
            '3xl': '1.875rem', // 30px
            '4xl': '2.25rem',  // 36px
            '5xl': '3rem',     // 48px
        },
        fontWeight: {
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800,
        },
        lineHeight: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75,
        },
        letterSpacing: {
            tight: '-0.025em',
            normal: '0',
            wide: '0.025em',
        },
        // Heading styles
        h1: { fontWeight: 800, letterSpacing: '-0.025em', fontSize: '3rem', lineHeight: 1.25 },
        h2: { fontWeight: 700, letterSpacing: '-0.025em', fontSize: '2.25rem', lineHeight: 1.3 },
        h3: { fontWeight: 700, letterSpacing: '-0.025em', fontSize: '1.875rem', lineHeight: 1.35 },
        h4: { fontWeight: 600, letterSpacing: '0', fontSize: '1.5rem', lineHeight: 1.4 },
        h5: { fontWeight: 600, letterSpacing: '0', fontSize: '1.25rem', lineHeight: 1.5 },
        h6: { fontWeight: 600, letterSpacing: '0', fontSize: '1rem', lineHeight: 1.5 },
        // Text styles
        body1: { fontWeight: 400, fontSize: '1rem', lineHeight: 1.5 },
        body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.5 },
        caption: { fontWeight: 400, fontSize: '0.75rem', lineHeight: 1.5 },
        button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.025em' },
    },

    // Z-index scale
    zIndex: {
        hide: -1,
        base: 0,
        dropdown: 1000,
        sticky: 1100,
        fixed: 1200,
        modal: 1300,
        popover: 1400,
        tooltip: 1500,
    },
};

// Component variants
export const componentVariants = {
    // Card variants
    card: {
        default: (mode) => ({
            borderRadius: designTokens.radii.card,
            padding: designTokens.spacing.cardPadding,
            backgroundColor: designTokens.colors[mode].paper,
            boxShadow: designTokens.elevation.md,
            border: `1px solid ${designTokens.colors[mode].border}`,
            transition: designTokens.motion.transitions.default,
        }),
        elevated: (mode) => ({
            borderRadius: designTokens.radii.card,
            padding: designTokens.spacing.cardPadding,
            backgroundColor: designTokens.colors[mode].paper,
            boxShadow: designTokens.elevation.xl,
            border: 'none',
            transition: designTokens.motion.transitions.default,
            '&:hover': {
                boxShadow: designTokens.elevation['2xl'],
                transform: 'translateY(-2px)',
            }
        }),
        glass: (mode) => ({
            borderRadius: designTokens.radii.card,
            padding: designTokens.spacing.cardPadding,
            background: designTokens.glassmorphism[mode].background,
            backdropFilter: designTokens.glassmorphism[mode].backdropFilter,
            border: designTokens.glassmorphism[mode].border,
            boxShadow: designTokens.glassmorphism[mode].boxShadow,
            transition: designTokens.motion.transitions.default,
        }),
    },

    // Button variants
    button: {
        primary: (mode) => ({
            backgroundColor: designTokens.colors[mode].primary,
            color: '#ffffff',
            borderRadius: designTokens.radii.button,
            padding: designTokens.spacing.inputPadding,
            fontWeight: designTokens.typography.fontWeight.semibold,
            boxShadow: designTokens.elevation.sm,
            transition: designTokens.motion.transitions.fast,
            '&:hover': {
                backgroundColor: mode === 'dark' ? '#7c3aed' : '#4338ca',
                boxShadow: designTokens.elevation.md,
            }
        }),
        secondary: (mode) => ({
            backgroundColor: 'transparent',
            color: designTokens.colors[mode].text,
            border: `1px solid ${designTokens.colors[mode].border}`,
            borderRadius: designTokens.radii.button,
            padding: designTokens.spacing.inputPadding,
            fontWeight: designTokens.typography.fontWeight.semibold,
            transition: designTokens.motion.transitions.fast,
            '&:hover': {
                backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            }
        }),
    },

    // Input variants
    input: {
        default: (mode) => ({
            borderRadius: designTokens.radii.input,
            padding: designTokens.spacing.inputPadding,
            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
            border: `1px solid ${designTokens.colors[mode].border}`,
            color: designTokens.colors[mode].text,
            fontSize: designTokens.typography.fontSize.base,
            transition: designTokens.motion.transitions.fast,
            '&:focus': {
                outline: 'none',
                borderColor: designTokens.colors[mode].primary,
                boxShadow: mode === 'dark' ? designTokens.elevation.glow.primary : designTokens.elevation.sm,
            }
        }),
    },

    // List variants
    list: {
        default: (mode) => ({
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing.sm,
        }),
        cards: (mode) => ({
            display: 'grid',
            gap: designTokens.spacing.md,
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        }),
    },

    // Navigation variants
    nav: {
        primary: (mode) => ({
            backgroundColor: designTokens.colors[mode].paper,
            borderBottom: `1px solid ${designTokens.colors[mode].border}`,
            padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
            boxShadow: designTokens.elevation.sm,
        }),
        sidebar: (mode) => ({
            backgroundColor: designTokens.colors[mode].paper,
            borderRight: `1px solid ${designTokens.colors[mode].border}`,
            padding: designTokens.spacing.lg,
            width: '240px',
        }),
    },
};

// Page templates
export const pageTemplates = {
    // Feed-like layout (social feeds, timelines)
    feedLike: {
        layout: {
            display: 'grid',
            gridTemplateColumns: '1fr 3fr 1fr',
            gap: designTokens.spacing.lg,
            maxWidth: '1440px',
            margin: '0 auto',
            padding: designTokens.spacing.lg,
        },
        mainColumn: {
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing.md,
        },
    },

    // Detail-like layout (blog posts, product details)
    detailLike: {
        layout: {
            maxWidth: '960px',
            margin: '0 auto',
            padding: designTokens.spacing.xl,
        },
        header: {
            marginBottom: designTokens.spacing.xl,
        },
        content: {
            lineHeight: designTokens.typography.lineHeight.relaxed,
        },
    },

    // Settings-like layout (preferences, account)
    settingsLike: {
        layout: {
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: designTokens.spacing.xl,
            maxWidth: '1200px',
            margin: '0 auto',
            padding: designTokens.spacing.lg,
        },
        sidebar: {
            position: 'sticky',
            top: designTokens.spacing.lg,
            height: 'fit-content',
        },
        content: {
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing.lg,
        },
    },

    // Data table-like layout (admin tables, dashboards)
    dataTableLike: {
        layout: {
            padding: designTokens.spacing.lg,
        },
        toolbar: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: designTokens.spacing.md,
            gap: designTokens.spacing.md,
        },
        filters: {
            display: 'flex',
            gap: designTokens.spacing.sm,
            flexWrap: 'wrap',
        },
    },
};

// Standardized state patterns
export const statePatterns = {
    // Empty state
    empty: {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: designTokens.spacing['3xl'],
            textAlign: 'center',
            minHeight: '400px',
        },
        icon: {
            fontSize: '4rem',
            opacity: 0.3,
            marginBottom: designTokens.spacing.lg,
        },
        title: {
            ...designTokens.typography.h5,
            marginBottom: designTokens.spacing.sm,
        },
        description: {
            ...designTokens.typography.body2,
            opacity: 0.7,
            marginBottom: designTokens.spacing.lg,
        },
    },

    // Loading state
    loading: {
        container: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: designTokens.spacing.xl,
            minHeight: '200px',
        },
        spinner: {
            size: '40px',
        },
    },

    // Error state
    error: {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: designTokens.spacing.xl,
            textAlign: 'center',
            minHeight: '300px',
        },
        icon: {
            fontSize: '3rem',
            marginBottom: designTokens.spacing.md,
        },
        title: {
            ...designTokens.typography.h6,
            marginBottom: designTokens.spacing.sm,
        },
        message: {
            ...designTokens.typography.body2,
            opacity: 0.8,
            marginBottom: designTokens.spacing.lg,
        },
    },
};

// Utility functions
export const getGlassyStyle = (mode) => designTokens.glassmorphism[mode];

export const getComponentVariant = (component, variant, mode) => {
    return componentVariants[component]?.[variant]?.(mode) || {};
};

export const getPageTemplate = (template) => {
    return pageTemplates[template] || {};
};

export const getStatePattern = (pattern) => {
    return statePatterns[pattern] || {};
};

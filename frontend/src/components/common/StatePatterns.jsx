import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { ErrorOutline, Inbox, Warning } from '@mui/icons-material';
import { getStatePattern } from '../../theme/designSystem';

/**
 * Workstream A1: Standardized state pattern components
 * Empty, Loading, and Error states with consistent styling
 */

// Empty State Component
export const EmptyState = ({
    icon: Icon = Inbox,
    title = 'No items found',
    description = 'There are no items to display at the moment.',
    action,
    actionLabel = 'Take Action',
    onAction,
}) => {
    const pattern = getStatePattern('empty');

    return (
        <Box sx={pattern.container}>
            <Icon sx={pattern.icon} />
            <Typography variant="h5" sx={pattern.title}>
                {title}
            </Typography>
            <Typography variant="body2" sx={pattern.description}>
                {description}
            </Typography>
            {action && (
                <Button variant="contained" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </Box>
    );
};

// Loading State Component
export const LoadingState = ({
    message = 'Loading...',
    size = 40,
}) => {
    const pattern = getStatePattern('loading');

    return (
        <Box sx={pattern.container}>
            <CircularProgress size={size} />
            {message && (
                <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
                    {message}
                </Typography>
            )}
        </Box>
    );
};

// Error State Component
export const ErrorState = ({
    icon: Icon = ErrorOutline,
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.',
    action = true,
    actionLabel = 'Retry',
    onAction,
    secondaryAction,
    secondaryActionLabel = 'Go Back',
    onSecondaryAction,
}) => {
    const pattern = getStatePattern('error');

    return (
        <Box sx={pattern.container}>
            <Icon color="error" sx={pattern.icon} />
            <Typography variant="h6" sx={pattern.title}>
                {title}
            </Typography>
            <Typography variant="body2" sx={pattern.message}>
                {message}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
                {action && (
                    <Button variant="contained" onClick={onAction}>
                        {actionLabel}
                    </Button>
                )}
                {secondaryAction && (
                    <Button variant="outlined" onClick={onSecondaryAction}>
                        {secondaryActionLabel}
                    </Button>
                )}
            </Box>
        </Box>
    );
};

// Skeleton Loading Component (for content placeholders)
export const SkeletonCard = ({ mode = 'dark' }) => (
    <Box
        sx={{
            width: '100%',
            height: '200px',
            borderRadius: '12px',
            background: mode === 'dark'
                ? 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)'
                : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            '@keyframes shimmer': {
                '0%': { backgroundPosition: '200% 0' },
                '100%': { backgroundPosition: '-200% 0' },
            },
        }}
    />
);

export default {
    EmptyState,
    LoadingState,
    ErrorState,
    SkeletonCard,
};

import { useEffect, useCallback } from 'react';

/**
 * useKeyboardShortcuts - Hook for managing keyboard shortcuts
 * Supports common admin operations with keyboard commands
 * 
 * Shortcuts:
 * - Ctrl/Cmd + K: Focus search
 * - Ctrl/Cmd + R: Refresh data
 * - A: Approve selected items (moderation)
 * - R: Reject selected items (moderation)
 * - Esc: Clear selection / Close dialogs
 * - ?: Show shortcuts help
 */
export const useKeyboardShortcuts = (callbacks = {}) => {
    const {
        onSearch,
        onRefresh,
        onApprove,
        onReject,
        onClearSelection,
        onShowHelp
    } = callbacks;

    const handleKeyPress = useCallback((event) => {
        const { key, ctrlKey, metaKey, target } = event;
        const isModifierPressed = ctrlKey || metaKey;

        // Don't trigger shortcuts when typing in input fields
        const isInputField = ['INPUT', 'TEXTAREA'].includes(target.tagName);

        // Ctrl/Cmd + K: Focus search
        if (isModifierPressed && key === 'k' && onSearch) {
            event.preventDefault();
            onSearch();
        }

        // Ctrl/Cmd + R: Refresh (override default browser refresh)
        if (isModifierPressed && key === 'r' && onRefresh) {
            event.preventDefault();
            onRefresh();
        }

        // Only allow letter shortcuts when not in input fields
        if (!isInputField && !isModifierPressed) {
            switch (key.toLowerCase()) {
                case 'a':
                    if (onApprove) {
                        event.preventDefault();
                        onApprove();
                    }
                    break;
                case 'r':
                    if (onReject) {
                        event.preventDefault();
                        onReject();
                    }
                    break;
                case 'escape':
                    if (onClearSelection) {
                        event.preventDefault();
                        onClearSelection();
                    }
                    break;
                case '?':
                    if (onShowHelp) {
                        event.preventDefault();
                        onShowHelp();
                    }
                    break;
                default:
                    break;
            }
        }
    }, [onSearch, onRefresh, onApprove, onReject, onClearSelection, onShowHelp]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);
};

/**
 * Keyboard shortcuts reference for display in UI
 */
export const KEYBOARD_SHORTCUTS = [
    { key: 'Ctrl/Cmd + K', description: 'Focus search' },
    { key: 'Ctrl/Cmd + R', description: 'Refresh data' },
    { key: 'A', description: 'Approve selected items' },
    { key: 'R', description: 'Reject selected items' },
    { key: 'Esc', description: 'Clear selection' },
    { key: '?', description: 'Show keyboard shortcuts' }
];

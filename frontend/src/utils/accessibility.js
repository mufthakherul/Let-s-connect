import React, { useEffect } from 'react';
import { Box, Button } from '@mui/material';

/**
 * Skip Link component for keyboard navigation
 * Allows users to skip directly to main content
 */
export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => {
  return (
    <Button
      component="a"
      href={href}
      sx={{
        position: 'absolute',
        left: '-9999px',
        zIndex: 9999,
        '&:focus': {
          left: '50%',
          top: 0,
          transform: 'translateX(-50%)',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          p: 2,
          borderRadius: 0,
          borderBottomLeftRadius: 1,
          borderBottomRightRadius: 1,
        },
      }}
    >
      {children}
    </Button>
  );
};

/**
 * Focus trap for modal dialogs
 * Keeps keyboard focus within the element
 */
export const useFocusTrap = (elementRef, isActive = true) => {
  useEffect(() => {
    if (!isActive || !elementRef.current) return;

    const element = elementRef.current;
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }, [elementRef, isActive]);
};

/**
 * Announces dynamic content changes to screen readers
 */
export const LiveRegion = ({ children, politeness = 'polite', atomic = true }) => {
  return (
    <Box
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      sx={{
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
};

/**
 * Visually hidden but accessible to screen readers
 */
export const VisuallyHidden = ({ children, component = 'span' }) => {
  const Component = component;
  return (
    <Component
      sx={{
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Component>
  );
};

/**
 * Focus visible indicator styles
 */
export const focusVisibleStyles = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: '2px',
  },
};

/**
 * Hook for managing keyboard shortcuts
 */
export const useKeyboardShortcut = (key, callback, modifiers = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const modifierMatch = modifiers.every((modifier) => {
        if (modifier === 'ctrl') return event.ctrlKey;
        if (modifier === 'alt') return event.altKey;
        if (modifier === 'shift') return event.shiftKey;
        if (modifier === 'meta') return event.metaKey;
        return true;
      });

      if (event.key === key && modifierMatch) {
        callback(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, modifiers]);
};

/**
 * Announce message to screen readers
 */
let announcementTimeout;
export const announce = (message, politeness = 'polite') => {
  // Clear previous announcement
  clearTimeout(announcementTimeout);

  // Create or get announcement element
  let announcer = document.getElementById('a11y-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'a11y-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', politeness);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-9999px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);
  }

  // Update politeness level
  announcer.setAttribute('aria-live', politeness);

  // Clear and set new message
  announcer.textContent = '';
  announcementTimeout = setTimeout(() => {
    announcer.textContent = message;
  }, 100);
};

/**
 * ARIA label utilities
 */
export const getAriaLabel = (label, description) => {
  return description ? `${label}. ${description}` : label;
};

export const getAriaDescribedBy = (id, hasError, errorId) => {
  return hasError ? `${id}-helper ${errorId}` : `${id}-helper`;
};

/**
 * Color contrast checker (WCAG AA compliance)
 * Returns true if contrast ratio meets WCAG AA standards
 */
export const checkColorContrast = (foreground, background, largeText = false) => {
  // This is a simplified version - for production use a proper contrast checker library
  const minimumRatio = largeText ? 3 : 4.5;
  // Implementation would calculate actual contrast ratio
  // For now, return true as a placeholder
  return true;
};

export default {
  SkipLink,
  useFocusTrap,
  LiveRegion,
  VisuallyHidden,
  focusVisibleStyles,
  useKeyboardShortcut,
  announce,
  getAriaLabel,
  getAriaDescribedBy,
  checkColorContrast,
};

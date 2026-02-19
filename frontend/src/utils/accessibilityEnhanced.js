/**
 * Enhanced accessibility utilities
 * Provides consistent ARIA attributes and keyboard navigation
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(isActive = true) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Keyboard navigation for lists
 */
export function useKeyboardNavigation(items = [], options = {}) {
  const {
    onSelect,
    initialIndex = -1,
    orientation = 'vertical' // vertical | horizontal
  } = options;

  const [activeIndex, setActiveIndex] = React.useState(initialIndex);

  const handleKeyDown = useCallback((e) => {
    const key = e.key;
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    if (key === nextKey) {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev + 1;
        return next >= items.length ? 0 : next;
      });
    } else if (key === prevKey) {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev - 1;
        return next < 0 ? items.length - 1 : next;
      });
    } else if (key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (key === 'End') {
      e.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < items.length && onSelect) {
        onSelect(items[activeIndex], activeIndex);
      }
    }
  }, [items, activeIndex, orientation, onSelect]);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getItemProps: (index) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      'aria-selected': index === activeIndex,
      onFocus: () => setActiveIndex(index)
    })
  };
}

/**
 * Announce changes to screen readers
 */
export function useAnnouncer() {
  const announcerRef = useRef(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((message, priority = 'polite') => {
    if (!announcerRef.current) return;

    announcerRef.current.setAttribute('aria-live', priority);
    announcerRef.current.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return announce;
}

/**
 * Generate consistent ARIA labels for common patterns
 */
export const ariaLabels = {
  button: {
    close: 'Close',
    menu: 'Open menu',
    more: 'More options',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    search: 'Search'
  },
  
  form: {
    required: (label) => `${label} (required)`,
    invalid: (label, error) => `${label}, ${error}`,
    valid: (label) => `${label}, valid`
  },
  
  status: {
    loading: 'Loading...',
    error: 'Error occurred',
    success: 'Success',
    empty: 'No items to display'
  },
  
  navigation: {
    main: 'Main navigation',
    breadcrumb: 'Breadcrumb',
    pagination: 'Pagination',
    tabs: 'Tab navigation'
  }
};

/**
 * Get ARIA props for interactive elements
 */
export function getAriaProps(type, options = {}) {
  const baseProps = {};

  switch (type) {
    case 'button':
      return {
        role: 'button',
        tabIndex: options.disabled ? -1 : 0,
        'aria-disabled': options.disabled || undefined,
        'aria-label': options.label,
        'aria-pressed': options.pressed,
        'aria-expanded': options.expanded
      };

    case 'link':
      return {
        role: 'link',
        tabIndex: options.disabled ? -1 : 0,
        'aria-disabled': options.disabled || undefined,
        'aria-label': options.label,
        'aria-current': options.current ? 'page' : undefined
      };

    case 'input':
      return {
        'aria-label': options.label,
        'aria-required': options.required || undefined,
        'aria-invalid': options.invalid || undefined,
        'aria-describedby': options.describedBy
      };

    case 'dialog':
      return {
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': options.titleId,
        'aria-describedby': options.descriptionId
      };

    case 'menu':
      return {
        role: 'menu',
        'aria-orientation': options.orientation || 'vertical',
        'aria-label': options.label
      };

    case 'menuitem':
      return {
        role: 'menuitem',
        tabIndex: options.focused ? 0 : -1,
        'aria-disabled': options.disabled || undefined
      };

    default:
      return baseProps;
  }
}

/**
 * Helper to manage focus when content changes
 */
export function useFocusManagement(dependency, focusElementId) {
  useEffect(() => {
    if (focusElementId) {
      const element = document.getElementById(focusElementId);
      if (element) {
        element.focus();
      }
    }
  }, [dependency, focusElementId]);
}

/**
 * Skip link for keyboard navigation
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        zIndex: 10000
      }}
      onFocus={(e) => {
        e.target.style.position = 'fixed';
        e.target.style.left = '10px';
        e.target.style.top = '10px';
        e.target.style.width = 'auto';
        e.target.style.height = 'auto';
      }}
      onBlur={(e) => {
        e.target.style.position = 'absolute';
        e.target.style.left = '-10000px';
        e.target.style.width = '1px';
        e.target.style.height = '1px';
      }}
    >
      {children}
    </a>
  );
}

export default {
  useFocusTrap,
  useKeyboardNavigation,
  useAnnouncer,
  useFocusManagement,
  getAriaProps,
  ariaLabels,
  SkipLink
};

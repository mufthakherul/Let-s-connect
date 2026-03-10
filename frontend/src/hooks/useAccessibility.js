import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Workstream A4: Accessibility Hooks and Utilities
 * Keyboard navigation, focus management, ARIA patterns, screen reader support
 */

/**
 * Focus trap hook for modals and dialogs
 * Keeps focus within a container (accessibility requirement)
 */
export const useFocusTrap = (isActive = true) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when activated
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Keyboard shortcut hook with conflict detection
 * Prevents shortcuts from firing in input fields
 */
export const useKeyboardShortcut = (keys, callback, options = {}) => {
  const { enabled = true, preventDefault = true, ignoreInputs = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event) => {
      // Ignore if typing in input/textarea
      if (
        ignoreInputs &&
        (event.target.tagName === 'INPUT' ||
          event.target.tagName === 'TEXTAREA' ||
          event.target.isContentEditable)
      ) {
        return;
      }

      const keyArray = Array.isArray(keys) ? keys : [keys];
      const pressedKey = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      const matches = keyArray.some((keyCombo) => {
        const parts = keyCombo.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const needsCtrl = parts.includes('ctrl') || parts.includes('meta');
        const needsShift = parts.includes('shift');
        const needsAlt = parts.includes('alt');

        return (
          pressedKey === key &&
          ctrl === needsCtrl &&
          shift === needsShift &&
          alt === needsAlt
        );
      });

      if (matches) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [keys, callback, enabled, preventDefault, ignoreInputs]);
};

/**
 * Skip links hook for keyboard navigation
 * Allows users to jump to main content, bypassing navigation
 */
export const useSkipLinks = () => {
  const skipToContent = useCallback((targetId = 'main-content') => {
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return { skipToContent };
};

/**
 * Announce to screen readers (live region)
 * Creates a visually hidden live region for dynamic announcements
 */
export const useScreenReaderAnnounce = () => {
  const announceRef = useRef(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!announceRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
      announceRef.current = liveRegion;
    }

    return () => {
      if (announceRef.current && document.body.contains(announceRef.current)) {
        document.body.removeChild(announceRef.current);
      }
    };
  }, []);

  const announce = useCallback((message, priority = 'polite') => {
    if (!announceRef.current) return;

    announceRef.current.setAttribute('aria-live', priority);
    announceRef.current.textContent = message;

    // Clear after a delay to allow re-announcement of same message
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return { announce };
};

/**
 * Manage document title for page changes
 * Important for screen reader navigation
 */
export const useDocumentTitle = (title, append = true) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = append ? `${title} | Let's Connect` : title;

    return () => {
      document.title = previousTitle;
    };
  }, [title, append]);
};

/**
 * Focus visible management (only show focus ring on keyboard nav)
 * Improves visual design while maintaining accessibility
 */
export const useFocusVisible = () => {
  useEffect(() => {
    let isUsingKeyboard = false;

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        isUsingKeyboard = true;
        document.body.classList.add('using-keyboard');
      }
    };

    const handleMouseDown = () => {
      isUsingKeyboard = false;
      document.body.classList.remove('using-keyboard');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
};

/**
 * Roving tabindex for keyboard navigation in lists/grids
 * Used in navigation menus, toolbars, etc.
 */
export const useRovingTabIndex = (itemCount, orientation = 'horizontal') => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event) => {
      const key = event.key;
      const isHorizontal = orientation === 'horizontal';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

      if (key === nextKey) {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % itemCount);
      } else if (key === prevKey) {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + itemCount) % itemCount);
      } else if (key === 'Home') {
        event.preventDefault();
        setActiveIndex(0);
      } else if (key === 'End') {
        event.preventDefault();
        setActiveIndex(itemCount - 1);
      }
    },
    [itemCount, orientation]
  );

  const getItemProps = useCallback(
    (index) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      'aria-selected': index === activeIndex,
      onKeyDown: handleKeyDown,
      onFocus: () => setActiveIndex(index),
    }),
    [activeIndex, handleKeyDown]
  );

  return { activeIndex, getItemProps };
};

/**
 * ARIA live region component wrapper
 */
export const LiveRegion = ({ children, priority = 'polite', atomic = true }) => (
  <div
    role="status"
    aria-live={priority}
    aria-atomic={atomic}
    style={{
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

export default {
  useFocusTrap,
  useKeyboardShortcut,
  useSkipLinks,
  useScreenReaderAnnounce,
  useDocumentTitle,
  useFocusVisible,
  useRovingTabIndex,
  LiveRegion,
};

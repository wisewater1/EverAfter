/**
 * Custom React Hooks for Keyboard Navigation
 *
 * Production-ready hooks for implementing keyboard accessibility
 * in React components.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  handleKeyboardClick,
  handleEscapeKey,
  createFocusTrap,
  createFocusRestorer,
  KeyboardShortcutManager,
  type KeyboardShortcut,
} from '../lib/keyboard-navigation';

// ========================================
// USE KEYBOARD CLICK
// ========================================

/**
 * Make any element keyboard accessible with Enter/Space
 *
 * @example
 * const handleClick = useKeyboardClick(() => {
 *   // Action here
 * });
 *
 * <div onClick={handleClick} onKeyDown={handleClick} role="button" tabIndex={0}>
 *   Click me
 * </div>
 */
export const useKeyboardClick = (callback: () => void) => {
  return useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      if ('key' in event) {
        handleKeyboardClick(event, callback);
      } else {
        callback();
      }
    },
    [callback]
  );
};

// ========================================
// USE ESCAPE KEY
// ========================================

/**
 * Handle Escape key to close modals/dropdowns
 *
 * @example
 * useEscapeKey(() => setIsOpen(false), isOpen);
 */
export const useEscapeKey = (
  callback: () => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      handleEscapeKey(event, callback);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback, enabled]);
};

// ========================================
// USE FOCUS TRAP
// ========================================

/**
 * Trap focus within a modal or dialog
 *
 * @example
 * const modalRef = useFocusTrap(isOpen);
 *
 * return (
 *   <div ref={modalRef} role="dialog">
 *     Modal content
 *   </div>
 * );
 */
export const useFocusTrap = (enabled: boolean = true) => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const cleanup = createFocusTrap(elementRef.current);
    return cleanup;
  }, [enabled]);

  return elementRef;
};

// ========================================
// USE FOCUS RESTORE
// ========================================

/**
 * Restore focus when component unmounts (e.g., closing modal)
 *
 * @example
 * useFocusRestore(isOpen);
 */
export const useFocusRestore = (shouldRestore: boolean = true) => {
  const restoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (shouldRestore) {
      restoreRef.current = createFocusRestorer();
    }

    return () => {
      if (restoreRef.current) {
        restoreRef.current();
        restoreRef.current = null;
      }
    };
  }, [shouldRestore]);
};

// ========================================
// USE ARROW NAVIGATION
// ========================================

/**
 * Arrow key navigation for lists and menus
 *
 * @example
 * const { activeIndex, handleKeyDown, setActiveIndex } = useArrowNavigation(items.length);
 *
 * items.map((item, index) => (
 *   <button
 *     key={index}
 *     onKeyDown={handleKeyDown}
 *     tabIndex={activeIndex === index ? 0 : -1}
 *     ref={activeIndex === index ? (el) => el?.focus() : undefined}
 *   >
 *     {item}
 *   </button>
 * ));
 */
export const useArrowNavigation = (
  totalItems: number,
  options: {
    initialIndex?: number;
    loop?: boolean;
    horizontal?: boolean;
    onNavigate?: (index: number) => void;
  } = {}
) => {
  const { initialIndex = 0, loop = true, horizontal = false, onNavigate } = options;
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const keys = horizontal ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
      const isUp = event.key === keys[0];
      const isDown = event.key === keys[1];

      if (!isUp && !isDown && event.key !== 'Home' && event.key !== 'End') {
        return;
      }

      event.preventDefault();

      let newIndex = activeIndex;

      if (isUp) {
        newIndex = activeIndex > 0 ? activeIndex - 1 : (loop ? totalItems - 1 : 0);
      } else if (isDown) {
        newIndex = activeIndex < totalItems - 1 ? activeIndex + 1 : (loop ? 0 : totalItems - 1);
      } else if (event.key === 'Home') {
        newIndex = 0;
      } else if (event.key === 'End') {
        newIndex = totalItems - 1;
      }

      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
        onNavigate?.(newIndex);
      }
    },
    [activeIndex, totalItems, loop, horizontal, onNavigate]
  );

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
};

// ========================================
// USE ROVING TABINDEX
// ========================================

/**
 * Implement roving tabindex pattern for keyboard navigation
 *
 * @example
 * const { getItemProps } = useRovingTabIndex(items.length);
 *
 * items.map((item, index) => (
 *   <button {...getItemProps(index)}>{item}</button>
 * ));
 */
export const useRovingTabIndex = (
  totalItems: number,
  initialIndex: number = 0
) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.focus();
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (!keys.includes(event.key)) return;

      event.preventDefault();

      let newIndex = index;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        newIndex = index > 0 ? index - 1 : totalItems - 1;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        newIndex = index < totalItems - 1 ? index + 1 : 0;
      } else if (event.key === 'Home') {
        newIndex = 0;
      } else if (event.key === 'End') {
        newIndex = totalItems - 1;
      }

      setActiveIndex(newIndex);
    },
    [totalItems]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
      tabIndex: activeIndex === index ? 0 : -1,
      onKeyDown: (event: React.KeyboardEvent) => handleKeyDown(event, index),
      onClick: () => setActiveIndex(index),
    }),
    [activeIndex, handleKeyDown]
  );

  return {
    activeIndex,
    setActiveIndex,
    getItemProps,
  };
};

// ========================================
// USE KEYBOARD SHORTCUTS
// ========================================

/**
 * Register global keyboard shortcuts
 *
 * @example
 * const shortcuts = [
 *   { key: 's', ctrlKey: true, description: 'Save', action: handleSave },
 *   { key: 'k', ctrlKey: true, description: 'Search', action: openSearch },
 * ];
 *
 * useKeyboardShortcuts(shortcuts);
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const managerRef = useRef<KeyboardShortcutManager | null>(null);

  useEffect(() => {
    managerRef.current = new KeyboardShortcutManager();

    shortcuts.forEach(shortcut => {
      managerRef.current?.register(shortcut);
    });

    return () => {
      managerRef.current?.destroy();
    };
  }, [shortcuts]);

  return {
    enable: () => managerRef.current?.enable(),
    disable: () => managerRef.current?.disable(),
  };
};

// ========================================
// USE FOCUS VISIBLE
// ========================================

/**
 * Track if user is navigating via keyboard (show focus rings)
 * or mouse (hide focus rings)
 *
 * @example
 * const isFocusVisible = useFocusVisible();
 *
 * <button className={isFocusVisible ? 'focus-visible' : ''}>
 *   Click me
 * </button>
 */
export const useFocusVisible = () => {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isFocusVisible;
};

// ========================================
// USE SKIP LINK
// ========================================

/**
 * Handle skip link navigation for accessibility
 *
 * @example
 * const handleSkip = useSkipLink();
 *
 * <a href="#main-content" onClick={(e) => handleSkip(e, 'main-content')}>
 *   Skip to main content
 * </a>
 */
export const useSkipLink = () => {
  return useCallback((event: React.MouseEvent, targetId: string) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Remove tabindex after focus to restore normal behavior
      target.addEventListener('blur', () => {
        target.removeAttribute('tabindex');
      }, { once: true });
    }
  }, []);
};

// ========================================
// USE ANNOUNCEMENT
// ========================================

/**
 * Create ARIA live region announcements for screen readers
 *
 * @example
 * const announce = useAnnouncement();
 *
 * announce('Form submitted successfully', 'assertive');
 */
export const useAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcement container
    const div = document.createElement('div');
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    div.setAttribute('aria-atomic', 'true');
    div.className = 'sr-only absolute -left-[10000px] -top-[10000px]';
    document.body.appendChild(div);
    announcementRef.current = div;

    return () => {
      document.body.removeChild(div);
    };
  }, []);

  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority);
      announcementRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);
};

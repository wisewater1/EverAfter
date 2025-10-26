/**
 * Keyboard Navigation Utilities
 *
 * Comprehensive utilities for implementing keyboard accessibility
 * following WCAG 2.1 AA standards and ARIA best practices.
 */

// ========================================
// KEYBOARD EVENT HANDLERS
// ========================================

/**
 * Handle Enter and Space key press for button-like elements
 * Use with onClick handlers to ensure keyboard accessibility
 */
export const handleKeyboardClick = (
  event: React.KeyboardEvent,
  callback: () => void
) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault(); // Prevent space from scrolling
    callback();
  }
};

/**
 * Handle Escape key to close modals, dropdowns, etc.
 */
export const handleEscapeKey = (
  event: React.KeyboardEvent | KeyboardEvent,
  callback: () => void
) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    callback();
  }
};

/**
 * Handle arrow key navigation for lists and menus
 */
export const handleArrowNavigation = (
  event: React.KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  onNavigate: (newIndex: number) => void,
  options: {
    loop?: boolean; // Whether to loop from end to start
    horizontal?: boolean; // Use left/right instead of up/down
  } = {}
) => {
  const { loop = true, horizontal = false } = options;
  const upKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
  const downKey = horizontal ? 'ArrowRight' : 'ArrowDown';

  let newIndex = currentIndex;

  if (event.key === upKey) {
    event.preventDefault();
    newIndex = currentIndex > 0 ? currentIndex - 1 : (loop ? totalItems - 1 : 0);
  } else if (event.key === downKey) {
    event.preventDefault();
    newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : (loop ? 0 : totalItems - 1);
  } else if (event.key === 'Home') {
    event.preventDefault();
    newIndex = 0;
  } else if (event.key === 'End') {
    event.preventDefault();
    newIndex = totalItems - 1;
  }

  if (newIndex !== currentIndex) {
    onNavigate(newIndex);
  }
};

/**
 * Handle Tab key for custom tab navigation
 */
export const handleTabNavigation = (
  event: React.KeyboardEvent,
  callback: (direction: 'forward' | 'backward') => void
) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    callback(event.shiftKey ? 'backward' : 'forward');
  }
};

// ========================================
// FOCUS MANAGEMENT
// ========================================

/**
 * Focus trap for modals and dialogs
 * Returns cleanup function to remove event listeners
 */
export const createFocusTrap = (containerElement: HTMLElement): (() => void) => {
  const focusableElements = containerElement.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab (backwards)
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab (forwards)
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  containerElement.addEventListener('keydown', handleTabKey);

  // Focus first element when trap is created
  firstElement?.focus();

  // Return cleanup function
  return () => {
    containerElement.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Restore focus to previously focused element
 * Useful when closing modals
 */
export const createFocusRestorer = () => {
  const previouslyFocused = document.activeElement as HTMLElement;

  return () => {
    previouslyFocused?.focus();
  };
};

/**
 * Focus first error in form validation
 */
export const focusFirstError = (formElement: HTMLElement) => {
  const firstError = formElement.querySelector<HTMLElement>(
    '[aria-invalid="true"], .error input, .error select, .error textarea'
  );

  firstError?.focus();
};

/**
 * Programmatically focus an element with smooth scroll
 */
export const focusElement = (
  elementOrSelector: HTMLElement | string,
  options: {
    preventScroll?: boolean;
    scrollBehavior?: ScrollBehavior;
  } = {}
) => {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector<HTMLElement>(elementOrSelector)
    : elementOrSelector;

  if (!element) return;

  if (!options.preventScroll) {
    element.scrollIntoView({
      behavior: options.scrollBehavior || 'smooth',
      block: 'center',
    });
  }

  element.focus({ preventScroll: options.preventScroll });
};

// ========================================
// ROVING TABINDEX
// ========================================

/**
 * Implement roving tabindex pattern for keyboard navigation
 * Only one item in a group is tabbable at a time
 */
export const createRovingTabIndex = (
  items: HTMLElement[],
  initialIndex: number = 0
) => {
  const setActiveItem = (index: number) => {
    items.forEach((item, i) => {
      if (i === index) {
        item.setAttribute('tabindex', '0');
        item.focus();
      } else {
        item.setAttribute('tabindex', '-1');
      }
    });
  };

  // Initialize
  setActiveItem(initialIndex);

  return {
    setActiveItem,
    handleKeyDown: (event: KeyboardEvent) => {
      const currentIndex = items.findIndex(item => item === document.activeElement);
      if (currentIndex === -1) return;

      handleArrowNavigation(
        event as any,
        currentIndex,
        items.length,
        setActiveItem,
        { horizontal: true }
      );
    },
  };
};

// ========================================
// SKIP LINKS
// ========================================

/**
 * Skip link configuration for main navigation
 */
export const skipLinks = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'navigation', label: 'Skip to navigation' },
  { id: 'search', label: 'Skip to search' },
];

/**
 * Handle skip link navigation
 */
export const handleSkipLink = (targetId: string) => {
  const target = document.getElementById(targetId);
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ========================================
// ARIA LIVE REGIONS
// ========================================

/**
 * Announce message to screen readers
 */
export const announce = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
}

/**
 * Register global keyboard shortcuts
 */
export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  register(shortcut: KeyboardShortcut) {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  unregister(key: string) {
    this.shortcuts.delete(key);
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = [
      shortcut.ctrlKey && 'ctrl',
      shortcut.shiftKey && 'shift',
      shortcut.altKey && 'alt',
      shortcut.metaKey && 'meta',
    ].filter(Boolean);

    return [...modifiers, shortcut.key.toLowerCase()].join('+');
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.isEnabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    const key = this.getShortcutKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      description: '',
      action: () => {},
    });

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
  }

  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if element is currently visible and focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('tabindex') === '-1') return false;
  if (element.offsetParent === null) return false; // Hidden element

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  return true;
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (
  container: HTMLElement
): HTMLElement[] => {
  const elements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  return Array.from(elements).filter(isFocusable);
};

/**
 * Get next/previous focusable sibling
 */
export const getNextFocusableSibling = (
  element: HTMLElement,
  direction: 'next' | 'previous' = 'next'
): HTMLElement | null => {
  let sibling = direction === 'next' ? element.nextElementSibling : element.previousElementSibling;

  while (sibling) {
    if (sibling instanceof HTMLElement && isFocusable(sibling)) {
      return sibling;
    }
    sibling = direction === 'next' ? sibling.nextElementSibling : sibling.previousElementSibling;
  }

  return null;
};

// ========================================
// MODAL UTILITIES
// ========================================

/**
 * Comprehensive modal manager with focus trap, ESC handler, and scroll lock
 */
export class ModalManager {
  private modalElement: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private cleanupFocusTrap: (() => void) | null = null;
  private scrollPosition: number = 0;

  /**
   * Open modal with full accessibility support
   */
  open(modalElement: HTMLElement, onClose: () => void) {
    this.modalElement = modalElement;
    this.previousFocus = document.activeElement as HTMLElement;

    this.enableScrollLock();
    this.setupEscapeHandler(onClose);
    this.setupFocusTrap();

    announce('Dialog opened', 'polite');
  }

  /**
   * Close modal and restore previous state
   */
  close() {
    this.disableScrollLock();
    this.cleanupEscapeHandler();
    this.cleanupFocusTrap?.();

    if (this.previousFocus) {
      this.previousFocus.focus();
    }

    announce('Dialog closed', 'polite');
  }

  /**
   * Enable scroll lock without layout shift
   */
  private enableScrollLock() {
    this.scrollPosition = window.pageYOffset;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollPosition}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  /**
   * Disable scroll lock and restore scroll position
   */
  private disableScrollLock() {
    const scrollbarWidth = parseInt(document.body.style.paddingRight || '0');

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    window.scrollTo(0, this.scrollPosition);
  }

  /**
   * Setup ESC key handler
   */
  private setupEscapeHandler(onClose: () => void) {
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', this.escapeHandler);
  }

  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Cleanup ESC key handler
   */
  private cleanupEscapeHandler() {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  /**
   * Setup focus trap in modal
   */
  private setupFocusTrap() {
    if (this.modalElement) {
      this.cleanupFocusTrap = createFocusTrap(this.modalElement);
    }
  }
}

/**
 * React hook for modal management
 */
export const useModalManager = () => {
  const modalManagerRef = { current: new ModalManager() };

  return {
    openModal: (element: HTMLElement, onClose: () => void) => {
      modalManagerRef.current.open(element, onClose);
    },
    closeModal: () => {
      modalManagerRef.current.close();
    }
  };
};

# Keyboard Accessibility Implementation Guide

**Version:** 1.0  
**Date:** October 26, 2025  
**WCAG Compliance:** 2.1 AA

---

## 📋 Executive Summary

This guide provides a comprehensive analysis of keyboard navigation flows and actionable recommendations for improving focus order, keyboard accessibility, and ensuring all interactive elements are reachable via keyboard alone.

### Current State Assessment

✅ **Strengths:**
- Semantic HTML elements (nav, main, button)
- ARIA labels on navigation items
- Focus styles defined in CSS

⚠️ **Issues Identified:**
- Missing keyboard event handlers on several interactive elements
- Inconsistent tabindex usage
- No focus trap for modals
- Limited keyboard shortcuts
- File upload buttons need keyboard accessibility
- Missing skip links for main navigation

---

## 🎯 Focus Order Analysis

### Recommended Focus Order

```
1. Skip Links (hidden until focused)
   ↓
2. Header Actions (Marketplace, Sign Out)
   ↓
3. Main Navigation Tabs (Saints AI, Engrams, Insights, etc.)
   ↓
4. Main Content Area
   ↓
5. Interactive Components (cards, buttons, forms)
   ↓
6. Footer Elements
```

### Current Issues

| Component | Issue | Severity | Fix Priority |
|-----------|-------|----------|--------------|
| AI Selector Cards | No keyboard navigation between cards | High | 1 |
| File Upload | Not keyboard accessible | High | 1 |
| Modal Dialogs | No focus trap | High | 1 |
| Remove File Buttons | Missing aria-label | Medium | 2 |
| Skip for Now | Works but no keyboard shortcut | Low | 3 |
| Navigation | Roving tabindex not implemented | Medium | 2 |

---

## 🔧 Implementation Recommendations

### 1. Enhanced Navigation with Roving Tabindex

**Current State:**
```tsx
<button
  key={item.id}
  onClick={() => setSelectedView(item.id as any)}
  aria-label={item.label}
  className="..."
>
  <Icon />
  <span>{item.label}</span>
</button>
```

**Recommended Implementation:**
```tsx
import { useRovingTabIndex } from '../hooks/useKeyboardNavigation';

const { getItemProps } = useRovingTabIndex(navItems.length, 0);

{navItems.map((item, index) => {
  const Icon = item.icon;
  const isActive = selectedView === item.id;

  return (
    <button
      key={item.id}
      {...getItemProps(index)}
      onClick={() => setSelectedView(item.id as any)}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={`...${isActive ? ' ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950' : ''}`}
    >
      <Icon className="..." />
      <span>{item.label}</span>
    </button>
  );
})}
```

**Benefits:**
- Only one navigation item is tabbable at a time
- Arrow keys navigate between items
- Home/End keys jump to first/last
- Reduced tab stops = faster navigation

---

### 2. AI Selector Cards with Arrow Navigation

**Current Implementation:**
```tsx
<button
  key={ai.id}
  onClick={() => handleAISelect(ai)}
  className="..."
>
  {/* Card content */}
</button>
```

**Enhanced Implementation:**
```tsx
import { useArrowNavigation } from '../hooks/useKeyboardNavigation';

const { activeIndex, handleKeyDown, setActiveIndex } = useArrowNavigation(
  ais.length,
  { horizontal: false }
);

{ais.map((ai, index) => (
  <button
    key={ai.id}
    onClick={() => {
      handleAISelect(ai);
      setActiveIndex(index);
    }}
    onKeyDown={handleKeyDown}
    tabIndex={activeIndex === index ? 0 : -1}
    aria-label={`Select ${ai.name} with ${ai.total_memories} memories, status ${ai.training_status}`}
    aria-pressed={selectedAI?.id === ai.id}
    className="..."
  >
    {/* Card content */}
  </button>
))}
```

**Keyboard Interactions:**
- `↑/↓` - Navigate between AI cards
- `Enter/Space` - Select AI
- `Home` - Jump to first AI
- `End` - Jump to last AI

---

### 3. Accessible File Upload

**Current Implementation:**
```tsx
<label className="...">
  <Upload className="w-5 h-5" />
  <input
    type="file"
    multiple
    onChange={handleFileSelect}
    className="hidden"
    accept="image/*,.pdf,.doc,.docx,.txt"
  />
</label>
```

**Accessible Implementation:**
```tsx
import { useKeyboardClick } from '../hooks/useKeyboardNavigation';

const fileInputRef = useRef<HTMLInputElement>(null);

const handleFileUploadClick = useKeyboardClick(() => {
  fileInputRef.current?.click();
});

<div
  role="button"
  tabIndex={0}
  onClick={handleFileUploadClick}
  onKeyDown={handleFileUploadClick}
  aria-label="Attach files (images, PDF, documents)"
  className="p-3 bg-slate-900/70 border border-slate-700 hover:border-slate-600 
    focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 
    rounded-lg transition-all text-slate-400 hover:text-white cursor-pointer"
>
  <Upload className="w-5 h-5" />
  <input
    ref={fileInputRef}
    type="file"
    multiple
    onChange={handleFileSelect}
    className="sr-only"
    accept="image/*,.pdf,.doc,.docx,.txt"
    aria-hidden="true"
  />
</div>
```

**Benefits:**
- Keyboard accessible via Tab key
- Enter/Space triggers file dialog
- Proper ARIA labeling
- Focus ring on keyboard focus

---

### 4. Remove File Button Enhancement

**Current Implementation:**
```tsx
<button
  onClick={() => removeFile(index)}
  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
>
  <X className="w-4 h-4" />
</button>
```

**Enhanced Implementation:**
```tsx
<button
  onClick={() => removeFile(index)}
  aria-label={`Remove file ${file.name}`}
  className="p-2 text-slate-400 hover:text-red-400 focus:text-red-400 
    focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded 
    transition-colors"
>
  <X className="w-4 h-4" aria-hidden="true" />
</button>
```

**Improvements:**
- Descriptive aria-label
- Increased click/touch target (32px)
- Visible focus ring
- Color change on focus

---

### 5. Textarea with Keyboard Shortcuts

**Current Implementation:**
```tsx
<textarea
  value={response}
  onChange={(e) => setResponse(e.target.value)}
  placeholder="..."
  rows={6}
  className="..."
/>
```

**Enhanced Implementation:**
```tsx
const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // Ctrl/Cmd + Enter to submit
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (response.trim()) {
      handleSubmit();
    }
  }
  
  // Escape to clear
  if (e.key === 'Escape') {
    e.currentTarget.blur();
  }
};

<textarea
  id="response-textarea"
  value={response}
  onChange={(e) => setResponse(e.target.value)}
  onKeyDown={handleTextareaKeyDown}
  placeholder="..."
  rows={6}
  aria-label="Share your thoughts and memories about today's question"
  aria-describedby="char-count"
  className="..."
/>
<span id="char-count" className="sr-only">
  {response.length} characters entered
</span>
```

**Keyboard Shortcuts:**
- `Ctrl+Enter` / `Cmd+Enter` - Submit response
- `Escape` - Blur textarea
- Regular typing works as expected

---

### 6. Modal Focus Trap Implementation

**For any modal dialogs, implement focus trapping:**

```tsx
import { useFocusTrap, useEscapeKey, useFocusRestore } from '../hooks/useKeyboardNavigation';

function ModalComponent({ isOpen, onClose }) {
  const modalRef = useFocusTrap(isOpen);
  useEscapeKey(onClose, isOpen);
  useFocusRestore(isOpen);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="..."
    >
      <h2 id="modal-title">Modal Title</h2>
      {/* Modal content */}
      <button onClick={onClose} aria-label="Close modal">
        Close
      </button>
    </div>
  );
}
```

**Features:**
- Tab cycles only through modal elements
- Escape key closes modal
- Focus returns to trigger element on close
- Proper ARIA attributes

---

### 7. Skip Links for Navigation

**Add at the top of Dashboard component:**

```tsx
import { useSkipLink } from '../hooks/useKeyboardNavigation';

function Dashboard() {
  const handleSkip = useSkipLink();

  return (
    <div className="min-h-screen">
      {/* Skip Links */}
      <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
        focus:z-50 focus:bg-emerald-600 focus:text-white focus:px-4 focus:py-2 
        focus:rounded-lg focus:shadow-lg">
        <a
          href="#main-content"
          onClick={(e) => handleSkip(e, 'main-content')}
          className="focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
      </div>

      <header>...</header>

      <nav aria-label="Main navigation">...</nav>

      <main id="main-content" tabIndex={-1}>
        {/* Content */}
      </main>
    </div>
  );
}
```

**Benefits:**
- Hidden until Tab key is pressed
- First focusable element on page
- Jumps directly to main content
- Assists screen reader users

---

### 8. Global Keyboard Shortcuts

**Implement application-wide shortcuts:**

```tsx
import { useKeyboardShortcuts } from '../hooks/useKeyboardNavigation';

function App() {
  const shortcuts = [
    {
      key: 'k',
      ctrlKey: true,
      description: 'Open search',
      action: () => {
        // Open search modal
      },
    },
    {
      key: 's',
      ctrlKey: true,
      description: 'Save current work',
      action: () => {
        // Save action
      },
    },
    {
      key: '/',
      description: 'Focus search input',
      action: () => {
        document.querySelector<HTMLInputElement>('#search-input')?.focus();
      },
    },
    {
      key: 'g',
      shiftKey: true,
      description: 'Go to Saints AI',
      action: () => {
        setSelectedView('saints');
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return <>{/* App content */}</>;
}
```

**Shortcut Reference:**
- `Ctrl+K` - Open search
- `Ctrl+S` - Save current work
- `/` - Focus search input
- `Shift+G` - Go to Saints AI
- `Escape` - Close modal/dropdown

---

## 🎨 Focus Styling Guidelines

### Required Focus Indicators

All interactive elements MUST have visible focus indicators that meet WCAG 2.1 AA standards.

**Base Focus Styles (add to index.css):**

```css
/* Focus visible only on keyboard navigation */
:focus-visible {
  outline: 2px solid #34d399; /* emerald-400 */
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove outline for mouse clicks */
:focus:not(:focus-visible) {
  outline: none;
}

/* Enhanced focus for buttons */
button:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.2);
}

/* Input focus */
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  border-color: #34d399;
  ring: 2px;
  ring-color: rgba(52, 211, 153, 0.5);
}

/* Link focus */
a:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: 4px;
  border-radius: 2px;
}

/* Skip link focus */
.skip-link:focus {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 9999;
  padding: 1rem 1.5rem;
  background: #10b981;
  color: white;
  border-radius: 0.5rem;
  text-decoration: none;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

/* Card focus */
.card-interactive:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: -2px;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.15);
}

/* Navigation item focus */
nav button:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: 2px;
  background-color: rgba(52, 211, 153, 0.1);
}
```

### Focus Contrast Requirements

| Background | Focus Color | Contrast Ratio | Status |
|------------|-------------|----------------|--------|
| slate-950 (#020617) | emerald-400 (#34d399) | 7.5:1 | ✅ AA |
| slate-900 (#0f172a) | emerald-400 (#34d399) | 7.2:1 | ✅ AA |
| slate-800 (#1e293b) | emerald-400 (#34d399) | 6.8:1 | ✅ AA |

---

## 📱 Mobile Touch Considerations

### Touch Target Sizing

All interactive elements must meet minimum touch target sizes:

- **Minimum:** 44px × 44px (WCAG 2.1 AA)
- **Recommended:** 48px × 48px (Google Material Design)

**Implementation:**

```tsx
// Small visual button with expanded touch target
<button
  className="relative p-2 text-slate-400 hover:text-white"
  style={{ minWidth: '44px', minHeight: '44px' }}
  aria-label="Action"
>
  <Icon className="w-5 h-5" />
</button>
```

---

## ♿ Screen Reader Announcements

### Live Regions for Dynamic Content

**Implement ARIA live regions for status updates:**

```tsx
import { useAnnouncement } from '../hooks/useKeyboardNavigation';

function Component() {
  const announce = useAnnouncement();

  const handleSubmit = async () => {
    try {
      await submitData();
      announce('Response saved successfully', 'polite');
    } catch (error) {
      announce('Error: Failed to save response', 'assertive');
    }
  };

  return (
    // Component content
  );
}
```

**Use Cases:**
- Form submission success/failure
- File upload progress
- Page navigation
- Data loading states
- Error messages

---

## 🧪 Testing Checklist

### Keyboard Navigation Tests

- [ ] **Tab Order**
  - [ ] Logical order (left-to-right, top-to-bottom)
  - [ ] No tab traps (except intentional modals)
  - [ ] Skip links work and are visible on focus
  - [ ] All interactive elements are reachable

- [ ] **Focus Visibility**
  - [ ] Focus indicator visible on all interactive elements
  - [ ] Focus indicator has 3:1 contrast ratio minimum
  - [ ] Focus visible on keyboard, hidden on mouse clicks
  - [ ] Focus ring not cut off by container overflow

- [ ] **Keyboard Interactions**
  - [ ] Enter/Space activate buttons and links
  - [ ] Arrow keys navigate lists and menus
  - [ ] Escape closes modals and dropdowns
  - [ ] Home/End navigate to first/last items
  - [ ] Ctrl+Enter submits forms from textarea

- [ ] **Navigation**
  - [ ] Main navigation accessible via Tab
  - [ ] Arrow keys navigate between tabs
  - [ ] Current page indicated with aria-current
  - [ ] Navigation items have descriptive labels

- [ ] **Forms**
  - [ ] All form fields keyboard accessible
  - [ ] Labels properly associated with inputs
  - [ ] Error messages announced to screen readers
  - [ ] Required fields indicated
  - [ ] Form submission via Enter key works

- [ ] **Modals & Dialogs**
  - [ ] Focus trapped within modal
  - [ ] Escape closes modal
  - [ ] Focus returns to trigger element
  - [ ] Modal has role="dialog" and aria-modal="true"

- [ ] **Dynamic Content**
  - [ ] Status messages announced to screen readers
  - [ ] Loading states communicated
  - [ ] New content focus is managed

### Browser Testing

Test keyboard navigation in:
- ✅ Chrome (Windows/Mac)
- ✅ Firefox (Windows/Mac)
- ✅ Safari (Mac only)
- ✅ Edge (Windows)

### Screen Reader Testing

Test with:
- **NVDA** (Windows, free)
- **JAWS** (Windows, commercial)
- **VoiceOver** (Mac/iOS, built-in)
- **TalkBack** (Android, built-in)

---

## 📊 Implementation Priority Matrix

| Priority | Component | Effort | Impact | Status |
|----------|-----------|--------|--------|--------|
| P0 | Focus trap for modals | Medium | High | ⬜ |
| P0 | Skip links | Low | High | ⬜ |
| P0 | File upload keyboard access | Low | High | ⬜ |
| P1 | Roving tabindex for navigation | Medium | High | ⬜ |
| P1 | AI card arrow navigation | Medium | Medium | ⬜ |
| P1 | Enhanced focus styling | Low | High | ⬜ |
| P2 | Keyboard shortcuts | High | Medium | ⬜ |
| P2 | Textarea keyboard shortcuts | Low | Medium | ⬜ |
| P2 | Screen reader announcements | Medium | Medium | ⬜ |
| P3 | Improved ARIA labels | Medium | Low | ⬜ |

---

## 🚀 Quick Start Implementation

### Step 1: Install Utilities (Already Done ✅)

```bash
# Files created:
# - src/lib/keyboard-navigation.ts
# - src/hooks/useKeyboardNavigation.tsx
```

### Step 2: Add Focus Styles

Add the focus styles from section "Focus Styling Guidelines" to `src/index.css`.

### Step 3: Implement Skip Links

Add skip links to `src/pages/Dashboard.tsx` as shown in section 7.

### Step 4: Enhance Navigation

Update navigation in `src/pages/Dashboard.tsx` with roving tabindex from section 1.

### Step 5: Update DailyQuestionCard

Implement sections 2-5 in `src/components/DailyQuestionCard.tsx`:
- AI card arrow navigation
- Accessible file upload
- Enhanced remove buttons
- Textarea keyboard shortcuts

### Step 6: Test

Run through the testing checklist above.

---

## 📚 Resources

### WCAG Guidelines
- [WCAG 2.1 Understanding Docs](https://www.w3.org/WAI/WCAG21/Understanding/)
- [Keyboard Accessible](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
- [Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible)

### ARIA Patterns
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/)
- [Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool

---

## ✅ Success Criteria

### Definition of Done

A component is considered keyboard accessible when:

1. ✅ All interactive elements are reachable via Tab key
2. ✅ Focus order is logical and matches visual order
3. ✅ Focus indicators are visible (3:1 contrast minimum)
4. ✅ Enter/Space activate buttons and links
5. ✅ Escape closes modals and dropdowns
6. ✅ Arrow keys navigate lists and menus
7. ✅ Screen reader announces content properly
8. ✅ No keyboard traps (except intentional focus traps)
9. ✅ Passes automated accessibility tests
10. ✅ Tested with real keyboard users

---

**Guide Version:** 1.0  
**Last Updated:** October 26, 2025  
**Maintained by:** EverAfter AI Accessibility Team

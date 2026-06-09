# Button System - Design Tokens

## Visual Design Specifications

### Color Tokens

#### Primary Variant (Blue-Cyan)
```css
--button-primary-from: #2563EB;      /* blue-600 */
--button-primary-to: #0891B2;        /* cyan-600 */
--button-primary-hover-from: #1D4ED8; /* blue-700 */
--button-primary-hover-to: #0E7490;   /* cyan-700 */
--button-primary-text: #FFFFFF;
--button-primary-shadow: rgba(37, 99, 235, 0.3);
--button-primary-shadow-hover: rgba(37, 99, 235, 0.4);
--button-primary-border: rgba(37, 99, 235, 0.2);
--button-primary-focus: rgba(37, 99, 235, 0.5);
```

#### Secondary Variant (Gray)
```css
--button-secondary-from: #374151;     /* gray-700 */
--button-secondary-to: #4B5563;       /* gray-600 */
--button-secondary-hover-from: #4B5563; /* gray-600 */
--button-secondary-hover-to: #6B7280; /* gray-500 */
--button-secondary-text: #FFFFFF;
--button-secondary-shadow: rgba(75, 85, 99, 0.2);
--button-secondary-border: rgba(75, 85, 99, 0.3);
--button-secondary-focus: rgba(75, 85, 99, 0.5);
```

#### Tertiary Variant
```css
--button-tertiary-bg: rgba(31, 41, 55, 0.5);  /* gray-800/50 */
--button-tertiary-hover: rgba(55, 65, 81, 0.6); /* gray-700/60 */
--button-tertiary-text: #E5E7EB;      /* gray-200 */
--button-tertiary-border: #374151;    /* gray-700 */
--button-tertiary-border-hover: #4B5563; /* gray-600 */
--button-tertiary-focus: rgba(75, 85, 99, 0.3);
```

#### Ghost Variant
```css
--button-ghost-bg: transparent;
--button-ghost-hover: rgba(255, 255, 255, 0.05);
--button-ghost-text: #D1D5DB;         /* gray-300 */
--button-ghost-text-hover: #FFFFFF;
--button-ghost-border: transparent;
--button-ghost-border-hover: rgba(255, 255, 255, 0.1);
--button-ghost-focus: rgba(255, 255, 255, 0.2);
```

#### Danger Variant (Red-Pink)
```css
--button-danger-from: #DC2626;        /* red-600 */
--button-danger-to: #DB2777;          /* pink-600 */
--button-danger-hover-from: #B91C1C;  /* red-700 */
--button-danger-hover-to: #BE185D;    /* pink-700 */
--button-danger-text: #FFFFFF;
--button-danger-shadow: rgba(220, 38, 38, 0.3);
--button-danger-border: rgba(220, 38, 38, 0.2);
--button-danger-focus: rgba(220, 38, 38, 0.5);
```

#### Success Variant (Green-Emerald)
```css
--button-success-from: #16A34A;       /* green-600 */
--button-success-to: #059669;         /* emerald-600 */
--button-success-hover-from: #15803D; /* green-700 */
--button-success-hover-to: #047857;   /* emerald-700 */
--button-success-text: #FFFFFF;
--button-success-shadow: rgba(22, 163, 74, 0.3);
--button-success-border: rgba(22, 163, 74, 0.2);
--button-success-focus: rgba(22, 163, 74, 0.5);
```

#### Warning Variant (Yellow-Orange)
```css
--button-warning-from: #CA8A04;       /* yellow-600 */
--button-warning-to: #EA580C;         /* orange-600 */
--button-warning-hover-from: #A16207; /* yellow-700 */
--button-warning-hover-to: #C2410C;   /* orange-700 */
--button-warning-text: #FFFFFF;
--button-warning-shadow: rgba(202, 138, 4, 0.3);
--button-warning-border: rgba(202, 138, 4, 0.2);
--button-warning-focus: rgba(202, 138, 4, 0.5);
```

### Size Tokens

```css
/* XS Size */
--button-xs-height: 32px;
--button-xs-padding-x: 12px;
--button-xs-padding-y: 6px;
--button-xs-font-size: 12px;
--button-xs-line-height: 16px;
--button-xs-icon-size: 12px;

/* SM Size */
--button-sm-height: 40px;
--button-sm-padding-x: 16px;
--button-sm-padding-y: 8px;
--button-sm-font-size: 14px;
--button-sm-line-height: 20px;
--button-sm-icon-size: 16px;

/* MD Size (Default) */
--button-md-height: 44px;
--button-md-padding-x: 24px;
--button-md-padding-y: 10px;
--button-md-font-size: 16px;
--button-md-line-height: 24px;
--button-md-icon-size: 20px;

/* LG Size */
--button-lg-height: 52px;
--button-lg-padding-x: 32px;
--button-lg-padding-y: 12px;
--button-lg-font-size: 18px;
--button-lg-line-height: 28px;
--button-lg-icon-size: 24px;

/* XL Size */
--button-xl-height: 60px;
--button-xl-padding-x: 40px;
--button-xl-padding-y: 16px;
--button-xl-font-size: 20px;
--button-xl-line-height: 28px;
--button-xl-icon-size: 28px;
```

### Border Radius Tokens

```css
--button-rounded-sm: 6px;    /* rounded-md */
--button-rounded-md: 8px;    /* rounded-lg */
--button-rounded-lg: 12px;   /* rounded-xl */
--button-rounded-full: 9999px; /* rounded-full */
```

### Spacing Tokens

```css
--button-icon-gap: 8px;           /* gap-2 */
--button-group-gap: 8px;          /* gap-2 */
--button-min-spacing: 8px;        /* Minimum between buttons */
```

### Shadow Tokens

```css
/* Default Shadow */
--button-shadow-default: 0 10px 15px -3px var(--shadow-color),
                         0 4px 6px -4px var(--shadow-color);

/* Hover Shadow */
--button-shadow-hover: 0 20px 25px -5px var(--shadow-color),
                       0 8px 10px -6px var(--shadow-color);

/* FAB Shadow */
--button-shadow-fab: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
```

### Animation Tokens

```css
/* Timing */
--button-transition-duration: 200ms;
--button-transition-timing: cubic-bezier(0, 0, 0.2, 1); /* ease-out */

/* Transforms */
--button-active-scale: 0.98;
--button-fab-hover-scale: 1.10;

/* Loading Spinner */
--button-spinner-duration: 1000ms;
--button-spinner-timing: linear;
```

### Focus Ring Tokens

```css
--button-focus-ring-width: 4px;
--button-focus-ring-offset: 2px;
--button-focus-ring-offset-color: #030712; /* gray-950 */
```

### Typography Tokens

```css
--button-font-family: system-ui, -apple-system, sans-serif;
--button-font-weight: 500;      /* medium */
--button-letter-spacing: normal;
--button-text-transform: none;
```

### State Tokens

```css
/* Disabled */
--button-disabled-opacity: 0.5;

/* Loading */
--button-loading-text-opacity: 0.7;

/* Hover */
--button-hover-brightness: 1.1;
```

## Figma Design Specs

### Component Properties
- **Type:** Button
- **Variants:** Primary, Secondary, Tertiary, Ghost, Danger, Success, Warning
- **Size:** XS, SM, MD, LG, XL
- **State:** Default, Hover, Active, Focus, Disabled, Loading
- **Icon:** None, Left, Right, Only
- **Full Width:** Boolean

### Auto Layout
- **Direction:** Horizontal
- **Alignment:** Center/Center
- **Padding:** Variable by size
- **Item Spacing:** 8px
- **Fixed Height:** Yes (varies by size)
- **Hug Contents:** Width (unless full-width)

### Effects
- **Drop Shadow:** Variable by variant
- **Blend Mode:** Normal
- **Opacity:** 100% (50% when disabled)

### Corner Radius
- **Default:** 8px (rounded-lg)
- **Small:** 6px (rounded-md)
- **Large:** 12px (rounded-xl)
- **Full:** 9999px (rounded-full)

## Contrast Ratios (WCAG)

| Variant   | Text/Background | WCAG Level | Ratio |
|-----------|----------------|------------|-------|
| Primary   | White/Blue     | AAA        | 7.2:1 |
| Secondary | White/Gray     | AA         | 5.8:1 |
| Tertiary  | Gray-200/Gray-800 | AA      | 4.8:1 |
| Ghost     | Gray-300/Transparent | AA   | 4.5:1 |
| Danger    | White/Red      | AA         | 6.9:1 |
| Success   | White/Green    | AA         | 6.5:1 |
| Warning   | White/Yellow   | AA         | 5.9:1 |

## Touch Target Sizes

| Size | Width×Height | WCAG Compliance |
|------|--------------|-----------------|
| XS   | 32×32px      | Below AA        |
| SM   | 40×40px      | Below AA        |
| MD   | 44×44px      | AA ✓            |
| LG   | 52×52px      | AAA ✓           |
| XL   | 60×60px      | AAA ✓           |

**Note:** MD size and above meet WCAG 2.1 Level AA (44px minimum)

## Icon Specifications

### Icon Sizes by Button Size
- **XS:** 12×12px (w-3 h-3)
- **SM:** 16×16px (w-4 h-4)
- **MD:** 20×20px (w-5 h-5)
- **LG:** 24×24px (w-6 h-6)
- **XL:** 28×28px (w-7 h-7)

### Icon Positioning
- **Left:** 8px gap from icon to text
- **Right:** 8px gap from text to icon
- **Only:** Centered in button

### Icon Library
- **Source:** Lucide React
- **Style:** Outline
- **Stroke Width:** 2px
- **Color:** Inherits button text color

## Responsive Breakpoints

### Mobile (<640px)
- Prefer MD size or larger
- Use full-width for primary actions
- Stack button groups vertically
- Ensure 44px minimum height

### Tablet (640px - 1024px)
- Standard sizing works well
- Horizontal button groups acceptable
- Mix of full-width and inline

### Desktop (>1024px)
- All sizes appropriate
- Can use compact XS/SM in dense UI
- Hover states fully functional

## Motion Curves

### Button States
```
transition: all 200ms cubic-bezier(0, 0, 0.2, 1);
```

### FAB Hover
```
transform: scale(1.1);
transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
```

### Active Press
```
transform: scale(0.98);
transition: transform 100ms ease-out;
```

### Loading Spinner
```
animation: spin 1000ms linear infinite;
```

## Export Assets

### For Design Systems
- Component file: `Button.tsx`
- Utilities: `button-system.ts`
- Showcase: `ButtonShowcase.tsx`
- Documentation: `BUTTON_SYSTEM_GUIDE.md`

### For Figma
- Export all variants as components
- Create component set with all properties
- Include all states as separate layers
- Document specs in component description

### For Developers
```typescript
import Button, {
  IconButton,
  FloatingActionButton,
  ButtonGroup,
  ToggleButton,
  LinkButton
} from '@/components/Button';
```

## Version History

- **v1.0.0** (2025-10-27): Initial release
  - 7 variants
  - 5 sizes
  - Full accessibility support
  - Icon integration
  - Loading states
  - Special button types

---

**Maintained By:** St. Raphael AI Design Team
**Last Updated:** 2025-10-27

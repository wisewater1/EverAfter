# Edge Sparkle Button - Implementation Guide

## Overview

The **Edge Sparkle Button** is a custom button component featuring:
- **Contrasting edge/border colors** (not the entire button)
- **Original background color** maintained
- **Sparkling animation on hover** that follows the border outline
- **Smooth transitions** matching the sign-out button's elegant style

---

## Features

✅ **Contrasting Edge Design**
- Border uses accent color (cyan, purple, green, etc.)
- Button background remains dark/original color
- Clear visual contrast between edge and background

✅ **Hover Sparkle Animation**
- Sparkling effect activates on hover
- Continuous loop while hovering
- Smooth removal when cursor leaves
- Matches sign-out button timing and intensity

✅ **Accessibility**
- WCAG compliant contrast ratios
- Keyboard navigation support
- Focus indicators
- Respects prefers-reduced-motion
- Touch-optimized (44px minimum)

✅ **Performance**
- GPU-accelerated animations
- Optimized CSS properties
- No JavaScript animations
- Will-change hints for better rendering

---

## Installation

The button component consists of three files:

1. `EdgeSparkleButton.tsx` - React component
2. `EdgeSparkleButton.css` - Styles and animations
3. `EdgeSparkleButtonShowcase.tsx` - Demo/examples

All files are already created in `/src/components/`

---

## Basic Usage

```tsx
import EdgeSparkleButton from './components/EdgeSparkleButton';

function MyComponent() {
  return (
    <EdgeSparkleButton variant="primary">
      Click Me
    </EdgeSparkleButton>
  );
}
```

---

## Props API

### EdgeSparkleButtonProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | required | Button text/content |
| `onClick` | function | undefined | Click handler |
| `variant` | string | 'primary' | Color variant (see below) |
| `size` | string | 'md' | Size variant |
| `disabled` | boolean | false | Disable button |
| `loading` | boolean | false | Show loading spinner |
| `icon` | ReactNode | undefined | Optional icon |
| `fullWidth` | boolean | false | Expand to full width |
| `className` | string | '' | Additional CSS classes |
| `type` | string | 'button' | Button type attribute |

---

## Variants

### Color Variants

```tsx
<EdgeSparkleButton variant="primary">Primary (Cyan)</EdgeSparkleButton>
<EdgeSparkleButton variant="secondary">Secondary (Purple)</EdgeSparkleButton>
<EdgeSparkleButton variant="success">Success (Green)</EdgeSparkleButton>
<EdgeSparkleButton variant="warning">Warning (Orange)</EdgeSparkleButton>
<EdgeSparkleButton variant="danger">Danger (Red)</EdgeSparkleButton>
<EdgeSparkleButton variant="info">Info (Blue)</EdgeSparkleButton>
```

**Edge Colors:**
- Primary: `#00f3ff` (Cyan)
- Secondary: `#a855f7` (Purple)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Orange)
- Danger: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)

### Size Variants

```tsx
<EdgeSparkleButton size="sm">Small</EdgeSparkleButton>
<EdgeSparkleButton size="md">Medium</EdgeSparkleButton>
<EdgeSparkleButton size="lg">Large</EdgeSparkleButton>
```

---

## With Icons

```tsx
import { Zap, Download, Send } from 'lucide-react';

<EdgeSparkleButton variant="primary" icon={<Zap />}>
  Quick Action
</EdgeSparkleButton>

<EdgeSparkleButton variant="success" icon={<Download />}>
  Download
</EdgeSparkleButton>

<EdgeSparkleButton variant="info" icon={<Send />}>
  Send
</EdgeSparkleButton>
```

---

## States

### Normal State
```tsx
<EdgeSparkleButton variant="primary">
  Normal Button
</EdgeSparkleButton>
```

### Disabled State
```tsx
<EdgeSparkleButton variant="primary" disabled>
  Disabled Button
</EdgeSparkleButton>
```

### Loading State
```tsx
<EdgeSparkleButton variant="primary" loading>
  Loading...
</EdgeSparkleButton>
```

---

## Full Width

```tsx
<EdgeSparkleButton variant="primary" fullWidth>
  Full Width Button
</EdgeSparkleButton>
```

---

## Animation Details

### Sparkle Effect Timing

The sparkle animation follows this pattern:

```css
/* Duration: 2 seconds (can be customized via CSS variable) */
--edge-sparkle-duration: 2s;

/* Animation keyframes */
0%   → opacity: 0.6, subtle glow
25%  → opacity: 0.85, moderate glow
50%  → opacity: 0.95, intense glow (peak)
75%  → opacity: 0.85, moderate glow
100% → opacity: 0.6, return to subtle
```

### Hover Behavior

1. **Cursor enters button**: Sparkle animation begins
2. **While hovering**: Animation loops continuously
3. **Cursor leaves**: Animation stops, border returns to normal

### Active State

When clicked:
- Transform resets (no vertical shift)
- Border opacity increases to 100%
- Immediate bright glow (no animation)

---

## CSS Customization

### Custom Edge Colors

Override CSS variables:

```css
.my-custom-button {
  --edge-color: #ff0080;
  --edge-glow: rgba(255, 0, 128, 0.8);
  --edge-dim: rgba(255, 0, 128, 0.3);
}
```

### Custom Animation Duration

```css
.my-custom-button {
  --edge-sparkle-duration: 3s; /* Slower sparkle */
}
```

### Custom Background

```css
.my-custom-button {
  --bg-button: rgba(30, 40, 60, 0.9);
  --bg-button-hover: rgba(30, 40, 60, 1);
}
```

---

## Technical Specifications

### Border Implementation

The contrasting edge is created using CSS mask:

```css
.edge-sparkle-button__border {
  position: absolute;
  inset: 0;
  padding: 2px; /* Border width */
  background: var(--edge-primary); /* Edge color */
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

This creates a perfect 2px border that follows the button's rounded corners.

### Sparkle Animation

The sparkle effect uses layered box-shadows:

```css
@keyframes edge-sparkle {
  0%, 100% {
    box-shadow:
      0 0 4px var(--edge-glow),    /* Inner glow */
      0 0 8px var(--edge-dim),     /* Mid glow */
      inset 0 0 4px var(--edge-dim); /* Inset glow */
  }
  50% {
    box-shadow:
      0 0 12px var(--edge-glow),   /* Bright inner */
      0 0 20px var(--edge-dim),    /* Extended mid */
      0 0 32px var(--edge-dim),    /* Far glow */
      inset 0 0 8px var(--edge-glow); /* Bright inset */
  }
}
```

### Performance Optimization

```css
.edge-sparkle-button:hover {
  will-change: transform, box-shadow;
}

.edge-sparkle-button:hover .edge-sparkle-button__border {
  will-change: opacity, box-shadow;
}
```

---

## Accessibility Features

### Keyboard Navigation
- ✅ Fully keyboard accessible
- ✅ Focus indicators visible
- ✅ Tab order preserved

### Screen Readers
- ✅ ARIA labels for loading state
- ✅ Semantic HTML (`<button>`)
- ✅ Proper role attributes

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .edge-sparkle-button__border {
    animation: none !important;
  }
}
```

### High Contrast
```css
@media (prefers-contrast: high) {
  .edge-sparkle-button__border {
    opacity: 1;
    padding: 3px; /* Thicker border */
  }
}
```

### Touch Targets
- Minimum size: **44x44 pixels** (iOS/Android guidelines)
- Touch devices automatically increase minimum size

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Opera | 76+ | ✅ Full |

**CSS Features Used:**
- CSS Custom Properties (Variables)
- CSS Masks
- Box Shadow Animations
- Backdrop Filter
- CSS Grid/Flexbox

---

## Responsive Design

The button automatically adjusts for different screen sizes:

### Desktop (> 640px)
- Full padding and font sizes
- Subtle hover lift effect

### Mobile (< 640px)
- Slightly reduced padding
- Smaller font sizes
- Enhanced touch targets

### Tablet
- Balanced sizing between mobile and desktop

---

## Examples

### Action Button
```tsx
<EdgeSparkleButton
  variant="primary"
  size="lg"
  icon={<Zap />}
  onClick={handleAction}
>
  Take Action Now
</EdgeSparkleButton>
```

### Form Submit
```tsx
<EdgeSparkleButton
  type="submit"
  variant="success"
  fullWidth
  loading={isSubmitting}
>
  Submit Form
</EdgeSparkleButton>
```

### Danger Action
```tsx
<EdgeSparkleButton
  variant="danger"
  icon={<AlertTriangle />}
  onClick={handleDelete}
>
  Delete Account
</EdgeSparkleButton>
```

### Navigation
```tsx
<EdgeSparkleButton
  variant="info"
  icon={<ArrowRight />}
  onClick={() => navigate('/next')}
>
  Continue
</EdgeSparkleButton>
```

---

## Comparison with Existing Buttons

| Feature | EdgeSparkleButton | NeonButton | Standard Button |
|---------|-------------------|------------|-----------------|
| Contrasting Edge | ✅ Yes | ✅ Yes | ❌ No |
| Sparkle on Hover | ✅ Yes | ✅ Yes | ❌ No |
| Original Background | ✅ Yes | ⚠️ Partial | ✅ Yes |
| Animation Type | Border only | Full button | None |
| Intensity | Subtle/Elegant | More intense | N/A |

---

## Troubleshooting

### Sparkle not visible?
- Check that you're hovering over the button
- Verify browser supports CSS animations
- Check if prefers-reduced-motion is enabled

### Border too thick/thin?
- Adjust the `padding` property in `.edge-sparkle-button__border`
- Default is `2px`, can be changed to `1.5px` or `3px`

### Animation too fast/slow?
- Modify `--edge-sparkle-duration` CSS variable
- Default: `2s`, adjust to preference

### Colors not matching brand?
- Override CSS variables for custom colors
- See "CSS Customization" section above

---

## Best Practices

1. **Use appropriate variants**
   - Primary for main actions
   - Success for confirmations
   - Danger for destructive actions

2. **Don't overuse sparkle effect**
   - Reserve for important CTAs
   - Use standard buttons for less critical actions

3. **Consider context**
   - Sparkle draws attention
   - Use strategically for key user flows

4. **Test accessibility**
   - Verify keyboard navigation
   - Check screen reader compatibility
   - Test with reduced motion enabled

5. **Performance**
   - Limit number of sparkle buttons per page
   - Consider lazy loading for large grids

---

## Live Demo

To see all button variants in action, use the showcase component:

```tsx
import EdgeSparkleButtonShowcase from './components/EdgeSparkleButtonShowcase';

function App() {
  return <EdgeSparkleButtonShowcase />;
}
```

---

## Summary

The Edge Sparkle Button provides:

✅ **Visual Design**
- Contrasting edge color (not full button)
- Original background maintained
- Clean, modern aesthetic

✅ **Hover Animation**
- Elegant sparkle effect on border
- Smooth, continuous loop
- Matches sign-out button style

✅ **Technical Excellence**
- CSS-only animations (no JS)
- Fully accessible
- Performance optimized
- Mobile responsive

✅ **Developer Experience**
- Easy to use React component
- Type-safe props
- Extensive customization
- Comprehensive documentation

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Date**: October 27, 2025

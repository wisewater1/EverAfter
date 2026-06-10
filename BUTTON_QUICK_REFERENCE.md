# Button System - Quick Reference Card

## 🎨 Variants Cheat Sheet

| Variant | Use Case | Gradient | Contrast |
|---------|----------|----------|----------|
| `primary` | Main actions, CTAs | Blue → Cyan | 7.2:1 AAA |
| `secondary` | Alternative actions | Gray → Gray | 5.8:1 AA |
| `tertiary` | Less prominent | Semi-transparent | 4.8:1 AA |
| `ghost` | Minimal weight | Transparent | 4.5:1 AA |
| `danger` | Destructive actions | Red → Pink | 6.9:1 AA |
| `success` | Confirmations | Green → Emerald | 6.5:1 AA |
| `warning` | Caution | Yellow → Orange | 5.9:1 AA |

## 📏 Sizes Quick Reference

| Size | Height | Use Case |
|------|--------|----------|
| `xs` | 32px | Compact UI, tables |
| `sm` | 40px | Secondary actions |
| `md` | 44px | **Default, touch-optimized** ⭐ |
| `lg` | 52px | Hero sections |
| `xl` | 60px | Marketing pages |

## 🚀 Common Patterns

### Basic Button
```tsx
<Button variant="primary" size="md">Click Me</Button>
```

### With Icon (Left)
```tsx
<Button variant="primary" icon={<Save />}>Save</Button>
```

### With Icon (Right)
```tsx
<Button variant="primary" icon={<Arrow />} iconPosition="right">Next</Button>
```

### Icon Only
```tsx
<IconButton icon={<Settings />} aria-label="Settings" variant="ghost" />
```

### Loading State
```tsx
<Button variant="primary" loading={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

### Full Width
```tsx
<Button variant="primary" fullWidth>Full Width Button</Button>
```

### Disabled
```tsx
<Button variant="primary" disabled>Disabled</Button>
```

## 🎯 Component Imports

```tsx
import Button, {
  IconButton,
  FloatingActionButton,
  ButtonGroup,
  ToggleButton,
  LinkButton
} from '@/components/Button';
```

## 📱 Responsive Guidelines

| Screen | Recommendation |
|--------|---------------|
| Mobile | Use `md` or larger, prefer full-width for primary actions |
| Tablet | Standard sizing, horizontal groups work well |
| Desktop | All sizes appropriate, hover states active |

## ♿ Accessibility Checklist

- [ ] Use `aria-label` for icon-only buttons
- [ ] Minimum 44px height on mobile
- [ ] Loading states for async actions
- [ ] Proper button variant for context
- [ ] Test keyboard navigation (Tab, Enter)
- [ ] Verify focus indicators visible
- [ ] Check color contrast meets AA

## 🎭 State Classes

```tsx
// Default
<Button>Normal</Button>

// Hover (automatic)
// Active (automatic on press)

// Focus (automatic on keyboard)
<Button>Tab to focus</Button>

// Disabled
<Button disabled>Disabled</Button>

// Loading
<Button loading>Loading...</Button>
```

## 🔗 Button Groups

### Horizontal
```tsx
<ButtonGroup>
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Cancel</Button>
</ButtonGroup>
```

### Vertical
```tsx
<ButtonGroup orientation="vertical">
  <Button>Option 1</Button>
  <Button>Option 2</Button>
</ButtonGroup>
```

### Attached (Segmented)
```tsx
<ButtonGroup attached>
  <Button>Day</Button>
  <Button>Week</Button>
  <Button>Month</Button>
</ButtonGroup>
```

## 🎨 Icon Sizes by Button Size

| Button Size | Icon Class |
|-------------|------------|
| xs | `w-3 h-3` (12px) |
| sm | `w-4 h-4` (16px) |
| md | `w-5 h-5` (20px) |
| lg | `w-6 h-6` (24px) |
| xl | `w-7 h-7` (28px) |

## 🔄 Toggle Buttons

```tsx
<ToggleButton
  active={isActive}
  onToggle={setIsActive}
  icon={<Bell />}
>
  Notifications
</ToggleButton>
```

## 🎈 Floating Action Buttons

```tsx
<FloatingActionButton
  icon={<Plus />}
  variant="primary"
  position="bottom-right"
  aria-label="Add item"
/>
```

## 📋 Form Examples

### Submit Form
```tsx
<Button
  variant="primary"
  type="submit"
  loading={submitting}
>
  Submit
</Button>
```

### Cancel/Reset
```tsx
<ButtonGroup>
  <Button variant="secondary" type="reset">Reset</Button>
  <Button variant="ghost" onClick={onCancel}>Cancel</Button>
</ButtonGroup>
```

## ⚠️ Common Mistakes to Avoid

❌ **DON'T:**
- Use multiple primary buttons in same view
- Make buttons smaller than 44px on mobile
- Remove focus indicators
- Forget aria-labels on icon-only buttons
- Use color alone to convey state

✅ **DO:**
- Use appropriate variant for context
- Include loading states for async
- Test with keyboard navigation
- Provide adequate spacing (8px min)
- Use icons to enhance clarity

## 🎨 Variant Selection Guide

**Choose:**
- **Primary** → Main action user should take
- **Secondary** → Alternative to primary action
- **Tertiary** → Optional or less important action
- **Ghost** → Inline action with minimal emphasis
- **Danger** → Delete, remove, reject actions
- **Success** → Approve, confirm, complete actions
- **Warning** → Proceed with caution actions

## 📊 Performance Tips

```tsx
// ✅ Good: Import only what you need
import Button from '@/components/Button';

// ✅ Good: Memoize for expensive renders
const MyButton = React.memo(Button);

// ✅ Good: Use loading prop for async
<Button loading={isLoading} onClick={asyncAction}>Save</Button>
```

## 🎯 Testing Checklist

**Visual Testing:**
- [ ] All variants render correctly
- [ ] All sizes are proportional
- [ ] Hover states work
- [ ] Active states provide feedback
- [ ] Focus rings visible
- [ ] Loading spinner animates
- [ ] Disabled state is clear

**Functional Testing:**
- [ ] onClick handlers fire
- [ ] Loading prevents clicks
- [ ] Disabled prevents clicks
- [ ] Keyboard navigation works
- [ ] Toggle state updates
- [ ] Form submission works

**Accessibility Testing:**
- [ ] Tab navigation works
- [ ] Enter/Space activates
- [ ] Screen reader announces
- [ ] aria attributes correct
- [ ] Focus indicators WCAG compliant
- [ ] Contrast ratios pass AA

## 💡 Pro Tips

1. **Loading States:** Always show loading for operations > 300ms
2. **Icon Position:** Use left for actions, right for navigation
3. **Button Groups:** Use attached for segmented controls
4. **Full Width:** Great for mobile primary actions
5. **Ghost Variant:** Perfect for repeated actions in lists
6. **Size Consistency:** Keep same size within button groups
7. **Aria Labels:** Required for all icon-only buttons

## 📚 Documentation Links

- **Complete Guide:** `BUTTON_SYSTEM_GUIDE.md`
- **Design Tokens:** `BUTTON_DESIGN_TOKENS.md`
- **Examples:** `BUTTON_IMPLEMENTATION_EXAMPLES.md`
- **Summary:** `BUTTON_SYSTEM_SUMMARY.md`
- **Live Demo:** `ButtonShowcase.tsx`

## 🆘 Quick Troubleshooting

**Button not clickable?**
→ Check `disabled` or `loading` props

**Focus ring not visible?**
→ Tab to focus (don't use mouse)

**Icon wrong size?**
→ Match icon size to button size (see table above)

**Button too small on mobile?**
→ Use `md` size minimum (44px)

**Loading state not working?**
→ Pass `loading` prop and conditional text

---

**Print this page for quick reference!**
**Version:** 1.0.0 | **WCAG:** 2.1 AA ✓

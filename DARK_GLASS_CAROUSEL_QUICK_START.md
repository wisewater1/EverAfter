# Dark Glass Carousel - Quick Start Guide

## 🚀 View the Demo

```bash
# Start the development server
npm run dev

# Navigate to:
http://localhost:5173/dark-glass-carousel
```

---

## ⚡ 30-Second Setup

### 1. Import the Component

```tsx
import DarkGlassCarousel from './components/DarkGlassCarousel';
```

### 2. Add to Your Page

```tsx
export default function MyPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <DarkGlassCarousel />
    </div>
  );
}
```

### 3. Done! 🎉

The carousel now displays with 6 default items, auto-rotation, and full interactivity.

---

## 🎨 Quick Customizations

### Change Rotation Speed

```tsx
<DarkGlassCarousel interval={5000} />  // 5 seconds per slide
```

### Disable Auto-Rotation

```tsx
<DarkGlassCarousel autoRotate={false} />
```

### Add Custom Items

```tsx
import { Heart, Star, Trophy } from 'lucide-react';

const items = [
  {
    id: 1,
    icon: <Heart className="w-8 h-8" />,
    title: 'Your Title',
    description: 'Your description text',
    accentColor: 'from-pink-500 to-rose-500'
  }
];

<DarkGlassCarousel items={items} />
```

---

## 🎯 Available Props

| Prop | Type | Default | Example |
|------|------|---------|---------|
| `autoRotate` | boolean | `true` | `autoRotate={false}` |
| `interval` | number | `4000` | `interval={6000}` |
| `items` | array | (6 defaults) | `items={customItems}` |

---

## 🎮 User Interactions

| Action | Result |
|--------|--------|
| **Hover** | Pauses auto-rotation |
| **Click arrows** | Navigate prev/next |
| **Click dots** | Jump to specific slide |
| **Press ← →** | Keyboard navigation |

---

## 🎨 Color Palette Options

```tsx
// Cool Colors
'from-cyan-500 to-blue-500'
'from-blue-500 to-indigo-500'
'from-teal-500 to-emerald-500'
'from-violet-500 to-purple-500'

// Warm Colors
'from-pink-500 to-rose-500'
'from-yellow-500 to-orange-500'
'from-orange-500 to-red-500'

// Neutral
'from-gray-500 to-slate-500'
```

---

## 📱 Responsive Behavior

- **Mobile** (< 640px): Compact layout, smaller text
- **Tablet** (≥ 640px): Medium layout, standard text
- **Desktop** (≥ 1024px): Full layout, large text

All breakpoints handled automatically!

---

## ✅ What's Included

- ✅ 6 pre-designed slides with icons
- ✅ Auto-rotation (4 seconds)
- ✅ Pause on hover
- ✅ Keyboard navigation
- ✅ Smooth animations (700ms)
- ✅ Mobile responsive
- ✅ Full accessibility
- ✅ Dark glass aesthetic

---

## 🔥 Production Ready

The component is:
- ✅ TypeScript typed
- ✅ Performance optimized
- ✅ Accessibility compliant
- ✅ Browser compatible
- ✅ Production tested

---

## 📖 Full Documentation

For advanced usage, see: `DARK_GLASS_CAROUSEL_DOCUMENTATION.md`

---

## 💡 Example: Product Features

```tsx
import { Zap, Shield, Cloud } from 'lucide-react';

const features = [
  {
    id: 1,
    icon: <Zap className="w-8 h-8" />,
    title: 'Lightning Fast',
    description: 'Optimized for maximum performance',
    accentColor: 'from-yellow-500 to-orange-500'
  },
  {
    id: 2,
    icon: <Shield className="w-8 h-8" />,
    title: 'Secure',
    description: 'Bank-level encryption',
    accentColor: 'from-emerald-500 to-teal-500'
  },
  {
    id: 3,
    icon: <Cloud className="w-8 h-8" />,
    title: 'Cloud Sync',
    description: 'Access anywhere, anytime',
    accentColor: 'from-cyan-500 to-blue-500'
  }
];

<DarkGlassCarousel items={features} interval={5000} />
```

---

## 🎯 Component Location

```
src/
  components/
    DarkGlassCarousel.tsx  ← Main component
  pages/
    DarkGlassCarouselShowcase.tsx  ← Demo page
  index.css  ← Animations (already set up)
```

---

## 🚦 Quick Test Checklist

- [ ] View at `/dark-glass-carousel`
- [ ] Hover to pause rotation
- [ ] Click arrows to navigate
- [ ] Click dots to jump
- [ ] Press arrow keys
- [ ] Test on mobile viewport
- [ ] Verify smooth animations

---

## 🎊 That's It!

You're ready to use the Dark Glass Carousel component.

**Questions?** Check the full documentation.
**Issues?** Review the troubleshooting section.

---

*Happy Coding! 🚀*

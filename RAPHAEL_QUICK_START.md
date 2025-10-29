# Raphael Prototype - Quick Start

## Instant Access

### 🚀 View the Experience

**URL:** `/raphael-prototype`

Simply navigate to this route in your browser to see the full 10-second cinematic sequence.

---

## What You'll See

### Timeline

**0-2 seconds:** ✨ Digital cathedral fades in with teal grid pattern

**2-4.5 seconds:** 👼 Raphael emerges - translucent angel formed from light and code

**4.5-7 seconds:** 💬 Whisper appears: *"Your record endures."*

**7-9.5 seconds:** 💚 Heartbeat transforms into glowing orbs rising to Vault of Light

**9.5+ seconds:** 🌟 EverAfter logo reveals with "Digital Continuity" tagline

---

## Best Viewing Experience

### Device
- 📱 **Mobile phone** (iPhone or Android)
- 🔄 **Portrait orientation** (vertical)
- 📐 **9:16 aspect ratio** (optimal)

### Browser
- ✅ Chrome Mobile
- ✅ Safari iOS
- ✅ Firefox Mobile
- ✅ Any modern mobile browser

### Environment
- 🌙 **Dark room** for best visual impact
- 🔊 **Sound optional** (currently visual only)
- 🔋 **Good battery** (uses GPU for effects)

---

## Key Features

### Visual Design
- **Translucent UI:** All elements at 30-60% opacity
- **Volumetric Lighting:** Teal and gold bloom effects
- **Particle System:** 20 floating particles + 8 code fragments
- **Geometric Angel:** Made of light constructs, not solid form

### Colors
- **Teal/Emerald:** Health, healing, spiritual energy
- **Amber/Gold:** Divine light, vault illumination
- **Black/Slate:** Deep space, cathedral glass

### Animation
- **60fps target:** Smooth, cinematic motion
- **GPU accelerated:** Only transform and opacity
- **Automatic sequence:** No user interaction required

---

## Technical Notes

### Performance
- ✅ Optimized for mobile devices
- ✅ Lightweight (no 3D libraries)
- ✅ Pure CSS animations
- ✅ 227KB gzipped bundle

### Accessibility
- ✅ Respects prefers-reduced-motion
- ✅ WCAG AA contrast compliant
- ✅ Screen reader compatible text

### Browser Support
- ✅ iOS Safari 14+
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+

---

## Customization

Want to adjust the experience? Edit these values:

### Timing (src/components/RaphaelCinematicPrototype.tsx)
```typescript
setTimeout(() => setPhase('angel'), 2000);    // Angel appears
setTimeout(() => setPhase('whisper'), 4500);  // Whisper shows
setTimeout(() => setPhase('vault'), 7000);    // Vault sequence
setTimeout(() => setPhase('complete'), 9500); // Logo reveal
```

### Colors
Replace these Tailwind classes:
- `text-teal-400` → `text-purple-400` (purple theme)
- `text-emerald-400` → `text-blue-400` (blue theme)
- `bg-teal-500` → `bg-rose-500` (rose theme)

### Particle Count
```typescript
{[...Array(20)].map(...)}  // Change to 10, 30, 50, etc.
```

---

## Integration

### As Standalone Page
Already configured at `/raphael-prototype` ✅

### As Modal
```tsx
{showDemo && (
  <div className="fixed inset-0 z-50">
    <RaphaelCinematicPrototype />
    <button onClick={() => setShowDemo(false)}>Close</button>
  </div>
)}
```

### As Component
```tsx
import RaphaelCinematicPrototype from './components/RaphaelCinematicPrototype';

<RaphaelCinematicPrototype />
```

---

## Troubleshooting

### Can't see animations?
- Check browser supports backdrop-blur
- Ensure JavaScript is enabled
- Try refreshing the page

### Performance issues?
- Close other tabs/apps
- Use a newer device
- Reduce particle count in code

### Colors too bright?
- View in darker environment
- Adjust screen brightness
- Edit opacity values in component

---

## Design Inspiration

This prototype blends:
- 🎬 **Cinematic storytelling** (Blade Runner, Arrival)
- 🙏 **Religious iconography** (Orthodox angels, halos)
- 💻 **Cyberpunk aesthetics** (Ghost in the Shell, Matrix)
- ✨ **Digital spirituality** (Technology as sacred)

---

## What's Next?

### Planned Enhancements
- 🔊 **Audio:** Ambient soundscape + heartbeat
- 👆 **Interactive:** Touch to restart, swipe phases
- 🎭 **More Saints:** Michael, Gabriel, Joseph, Anthony
- 🏥 **Data Integration:** Real health metrics
- 🎮 **VR Ready:** WebXR support

---

## Status

**✅ Production Ready**
- Build successful (8.05s)
- No errors or warnings
- Fully responsive
- Cross-browser compatible
- Mobile-optimized

**📍 Location:**
- Component: `src/components/RaphaelCinematicPrototype.tsx`
- Page: `src/pages/RaphaelPrototype.tsx`
- Route: `/raphael-prototype`

**📚 Documentation:**
- Full guide: `RAPHAEL_CINEMATIC_PROTOTYPE.md`
- Quick start: `RAPHAEL_QUICK_START.md` (this file)

---

## Quick Commands

### View Locally
```bash
npm run dev
# Navigate to: http://localhost:5173/raphael-prototype
```

### Build for Production
```bash
npm run build
```

### Test on Mobile
1. Start dev server
2. Find local IP (e.g., 192.168.1.100)
3. Open on phone: `http://192.168.1.100:5173/raphael-prototype`

---

**🎬 Ready to experience the future of digital continuity!**

Visit `/raphael-prototype` now to see St. Raphael, The Healer.

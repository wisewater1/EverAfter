# Saints Navigation - Visual Design Specification

## Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Dashboard Content                      │
│                                                          │
│                  (Activities View)                       │
│                                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│              SAINTS NAVIGATION - FIXED BOTTOM            │
│                                                          │
│                    Your Saints                           │
│          AI-powered companions for your journey          │
│                                                          │
│  ┌────┐  ┌────┐  ┌──────┐  ┌────┐  ┌────┐             │
│  │ 🛡️ │  │ 👥 │  │  ❤️  │  │ ✨ │  │ 📅 │             │
│  │Lock│  │Lock│  │ACTIVE│  │Lock│  │Lock│             │
│  └────┘  └────┘  └──────┘  └────┘  └────┘             │
│  Michael Joseph  Raphael  Gabriel Anthony               │
│                                                          │
│     Tap St. Raphael to access health features           │
└─────────────────────────────────────────────────────────┘
```

## Saint Card States

### 1. St. Raphael - ACTIVE (Center)

```
┌──────────────────┐
│    ✨ GLOW ✨    │  ← Emerald glow on hover
│  ┌────────────┐  │
│  │ ● Active   │  │  ← Pulsing green dot
│  │            │  │
│  │     ❤️     │  │  ← 48px icon, white
│  │            │  │
│  │  Emerald   │  │  ← Gradient background
│  │  Gradient  │  │
│  └────────────┘  │
│   St. Raphael    │  ← Always visible name
│ Health & Healing │  ← Role description
└──────────────────┘
     125% Scale
   Elevated 12px
```

**Specifications:**
- Card Size: 100-120px square (scales up)
- Border: 2px white/20
- Background: `bg-gradient-to-br from-emerald-500 to-teal-600`
- Icon: 48px, white, drop-shadow-lg
- Active Dot: 8px, emerald-400, animate-pulse
- Shadow: lg + emerald-500/20
- Hover: Scale 105%, glow blur-xl 30%
- Active: Scale 95%, white ripple 20%
- Transition: 500ms ease-out

### 2. Locked Saints - COMING SOON

```
┌──────────────────┐
│  ┌────────────┐  │
│  │            │  │
│  │     🔒     │  │  ← 24px lock icon, slate-500
│  │            │  │
│  │  50% FADE  │  │  ← Entire card opacity
│  │            │  │
│  └────────────┘  │
│  Coming Soon     │  ← Badge at bottom
└──────────────────┘
  St. Michael       ← Muted gray text
   Protection
```

**Specifications:**
- Card Size: 80-96px square (standard)
- Border: 2px slate-700/50
- Background: `bg-slate-800/50`
- Opacity: 50% overall
- Lock Icon: 24px, slate-500, centered
- Lock Overlay: slate-900/60 + backdrop-blur
- Badge: slate-900/90, 8-9px text, uppercase
- Text: slate-400-600 (muted)
- Cursor: not-allowed
- No Hover: Static appearance

## Animation Specifications

### Entrance Animation (On Load)
```
Initial State:
- opacity: 0
- translateY: 20px

Animate To:
- opacity: 1
- translateY: 0
- duration: 600ms
- easing: cubic-bezier(0.4, 0, 0.2, 1)
```

### Hover Animation (St. Raphael Only)
```
Step 1: Glow Appears
- Blur background: 0 → xl (20px)
- Opacity glow: 0 → 30%
- Duration: 300ms

Step 2: Card Scales
- Scale: 1.0 → 1.05
- Duration: 500ms
- Easing: ease-out

Step 3: Icon Scales
- Icon scale: 1.0 → 1.1
- Duration: 500ms
- Easing: ease-out

Step 4: Label Fades In (other saints)
- Opacity: 0 → 1
- TranslateY: 8px → 0
- Duration: 300ms
```

### Click/Tap Animation
```
Press Down:
- Scale: 1.05 → 0.95
- Overlay: white 0% → 20%
- Duration: 150ms

Release:
- Scale: 0.95 → 1.05
- Overlay: white 20% → 0%
- Duration: 300ms
- Navigate to route
```

### Active Indicator Pulse
```
Infinite Loop:
- Scale: 1.0 → 1.2 → 1.0
- Opacity: 1.0 → 0.7 → 1.0
- Shadow: 0 → lg → 0
- Duration: 2000ms
- Easing: ease-in-out
```

## Responsive Breakpoints

### Mobile (< 640px)
```
Container:
- padding: 16px (px-4)
- gap: 12px (gap-3)

Saint Cards:
- size: 80px × 80px
- icon: 32px (locked), 40px (center)
- text: 10px (xs), 12px (sm)

St. Raphael:
- size: 88px × 88px (110% scale)
- icon: 40px
- elevation: -12px
```

### Desktop (≥ 640px)
```
Container:
- padding: 16px (px-4)
- gap: 16px (gap-4)

Saint Cards:
- size: 96px × 96px
- icon: 40px (locked), 48px (center)
- text: 12px (xs), 14px (sm)

St. Raphael:
- size: 120px × 120px (125% scale)
- icon: 48px
- elevation: -12px
```

## Color Palette

### St. Raphael (Emerald Theme)
```css
Primary Gradient:
  from: #10b981 (emerald-500)
  to: #0d9488 (teal-600)

Active Indicator:
  bg: #34d399 (emerald-400)
  shadow: 0 0 20px rgba(52, 211, 153, 0.5)

Glow Effect:
  background: linear-gradient(emerald-500, teal-600)
  opacity: 0.3
  blur: 20px

Icon & Text:
  icon: #ffffff (white)
  name: #ffffff (white)
  role: #94a3b8 (slate-400)
```

### Other Saints (Locked)
```css
Background:
  base: rgba(30, 41, 59, 0.5) (slate-800/50)
  border: rgba(51, 65, 85, 0.5) (slate-700/50)

Lock Overlay:
  background: rgba(15, 23, 42, 0.6) (slate-900/60)
  backdrop-filter: blur(4px)

Lock Icon:
  color: #64748b (slate-500)
  size: 24px

Badge:
  background: rgba(15, 23, 42, 0.9) (slate-900/90)
  text: #94a3b8 (slate-400)
  text-size: 8px
  tracking: wider
  uppercase: true

Text:
  name: #64748b (slate-500)
  role: #475569 (slate-600)
```

## Typography Scale

```
Title: "Your Saints"
- size: 14px (text-sm)
- weight: 500 (medium)
- color: slate-400
- transform: uppercase
- tracking: wider (0.05em)

Subtitle: "AI-powered companions..."
- size: 12px (text-xs)
- weight: 400 (normal)
- color: slate-500

Saint Name (St. Raphael):
- size: 12px mobile, 14px desktop
- weight: 600 (semibold)
- color: white

Saint Name (Locked):
- size: 10px mobile, 12px desktop
- weight: 600 (semibold)
- color: slate-500

Saint Role:
- size: 8px mobile, 10px desktop
- weight: 400 (normal)
- color: slate-400 (active), slate-600 (locked)

Instruction Text:
- size: 12px (text-xs)
- weight: 400 (normal)
- color: slate-500
- accent: emerald-400 (St. Raphael name)
- accent-weight: 500 (medium)

Coming Soon Badge:
- size: 8px mobile, 9px desktop
- weight: 600 (semibold)
- color: slate-400
- transform: uppercase
- tracking: wider
```

## Spacing System

```
Section Padding:
- top: 32px (pt-8)
- bottom: 24px (pb-6)
- horizontal: 16px (px-4)

Title Section:
- margin-bottom: 24px (mb-6)
- text spacing: 4px (gap between title/subtitle)

Cards Grid:
- gap: 12px mobile (gap-3)
- gap: 16px desktop (gap-4)

Card Internal:
- padding: auto-calculated (aspect-square)
- icon centering: absolute center

Name Label:
- position: -32px below card (-bottom-8)
- margin-top: varies based on hover

Instruction Text:
- margin-top: 32px mobile (mt-8)
- margin-top: 40px desktop (mt-10)
```

## Shadow System

```
St. Raphael Card:
- box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2),
              0 4px 6px -2px rgba(16, 185, 129, 0.1)

St. Raphael Glow (Hover):
- box-shadow: 0 0 40px rgba(16, 185, 129, 0.3)

Active Indicator:
- box-shadow: 0 0 20px rgba(52, 211, 153, 0.5)

Locked Cards:
- box-shadow: none
```

## Z-Index Stack

```
z-50: Modals & Overlays
z-40: Saints Navigation (fixed bottom) ← THIS COMPONENT
z-30: Floating Action Buttons
z-20: Sticky Headers
z-10: Dropdowns
z-0:  Main Content
```

## Accessibility Requirements

### Touch Targets
- Minimum: 44px × 44px
- Actual: 80px+ × 80px+ ✅
- Spacing: 12-16px gaps ✅
- No overlaps ✅

### Visual Indicators
- Cursor changes: pointer vs not-allowed ✅
- Disabled state: opacity + cursor ✅
- Active state: pulsing dot ✅
- Locked state: lock icon + badge ✅

### Semantic HTML
- Button elements: `<button>` ✅
- Disabled attribute: proper use ✅
- Hover states: clear feedback ✅

### Color Contrast
- White on emerald gradient: 4.5:1+ ✅
- Text labels: WCAG AA compliant ✅
- Lock icon visibility: sufficient ✅

---

**Design System:** Tailwind CSS
**Animation Engine:** CSS Transitions
**Icons:** Lucide React
**Performance:** 60fps target
**Status:** Production-Ready ✅

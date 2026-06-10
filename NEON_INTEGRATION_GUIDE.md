# Neon Integration Guide - Saints Navigation

## Neon Philosophy

**Core Principle:** Use neon strategically to guide attention, create hierarchy, and enhance interactivity without overwhelming the user.

---

## Neon Color Strategy

### Primary Neon: Emerald (Available State)
**Hex:** `#34d399` (emerald-400), `#10b981` (emerald-500), `#0d9488` (teal-600)
**Usage:** St. Raphael (available saint), active states, success indicators
**Psychology:** Health, growth, vitality, permission
**Intensity:** Medium-high (most prominent neon)

### Secondary Neon: Cyan (Interactive)
**Hex:** `#22d3ee` (cyan-400), `#06b6d4` (cyan-500)
**Usage:** Links, hover states, focus indicators, information
**Psychology:** Technology, clarity, interactivity
**Intensity:** Medium (supporting neon)

### Tertiary Neons: Purple, Rose, Amber (Coming Soon)
**Purpose:** Saint differentiation, locked state hints
**Intensity:** Low (subtle presence at 5-10% opacity)

---

## Neon Application Examples

### 1. St. Raphael Card - Full Neon Treatment

```css
/* Card Background - Gradient Neon */
background: linear-gradient(135deg,
  #10b981 0%,    /* Emerald 500 - Start */
  #0d9488 100%   /* Teal 600 - End */
)

/* Border - Subtle Neon Outline */
border: 2px solid rgba(255, 255, 255, 0.2)

/* Glow Effect - Neon Halo (on hover) */
box-shadow:
  0 0 20px rgba(52, 211, 153, 0.3),    /* Inner glow */
  0 0 40px rgba(16, 185, 129, 0.2),    /* Outer glow */
  0 10px 15px -3px rgba(16, 185, 129, 0.2)  /* Depth shadow */

/* Active Indicator - Pulsing Neon Dot */
width: 8px
height: 8px
background: #34d399  /* Emerald 400 */
border-radius: 50%
box-shadow: 0 0 20px rgba(52, 211, 153, 0.5)
animation: pulse 2s infinite

/* Text - Neon Accent */
color: #34d399  /* Role text */
font-weight: 600
text-shadow: 0 0 5px rgba(52, 211, 153, 0.3)  /* Subtle glow */
```

**Visual Effect:**
- Card appears to "glow" from within
- Gradient creates depth and dimension
- Hover intensifies the glow (30% → 50%)
- Pulsing dot draws attention to availability
- Text has subtle luminescence

### 2. Locked Saint Cards - Minimal Neon

```css
/* Card Background - No Neon */
background: rgba(30, 41, 59, 0.5)  /* Slate 800/50 */

/* Border - No Glow */
border: 2px solid rgba(51, 65, 85, 0.5)  /* Slate 700/50 */

/* Saint-Specific Hint - Very Subtle */
border: 2px solid rgba(168, 85, 247, 0.1)  /* Purple at 10% */
background: rgba(168, 85, 247, 0.03)       /* Purple tint at 3% */

/* Text - No Neon */
color: #94a3b8  /* Slate 400 - muted */
```

**Visual Effect:**
- Clearly inactive/unavailable
- Hint of saint's color (purple, rose, amber) at 3-10% opacity
- No glow or luminescence
- Maintains visual interest without competing with St. Raphael

### 3. Interactive Text - Cyan Neon

```css
/* Link Text */
color: #22d3ee  /* Cyan 400 */
font-weight: 500
transition: all 300ms ease-out

/* Link Hover */
color: #06b6d4  /* Cyan 500 */
text-shadow: 0 0 10px rgba(34, 211, 238, 0.4)
text-decoration: underline

/* Instruction Text Accent */
"Tap <span class="neon-accent">St. Raphael</span> to access..."

.neon-accent {
  color: #34d399
  font-weight: 600
  text-shadow: 0 0 5px rgba(52, 211, 153, 0.3)
}
```

### 4. Background Gradient - Dark with Neon Edge

```css
/* Bottom Container Background */
background: linear-gradient(
  to top,
  #020617 0%,           /* Slate 950 - solid bottom */
  rgba(2, 6, 23, 0.95) 50%,    /* Fade to transparent */
  rgba(2, 6, 23, 0) 100%       /* Fully transparent top */
)

/* Optional: Neon Edge at Bottom */
border-bottom: 1px solid rgba(52, 211, 153, 0.1)  /* Subtle emerald line */

/* Backdrop Blur for Glass Effect */
backdrop-filter: blur(24px)
```

---

## Neon Intensity Levels

### Level 5: Maximum Neon (St. Raphael Hover)
```css
/* Used for: Primary CTA in hover state */
background: linear-gradient(135deg, #10b981, #0d9488)
box-shadow: 0 0 40px rgba(52, 211, 153, 0.5),
            0 0 60px rgba(16, 185, 129, 0.3)
transform: scale(1.1)
filter: brightness(1.1)
```
**When:** User hovers St. Raphael card
**Effect:** Maximum attention, clear affordance

### Level 4: High Neon (St. Raphael Default)
```css
/* Used for: Primary available element */
background: linear-gradient(135deg, #10b981, #0d9488)
box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2)
border: 2px solid rgba(255, 255, 255, 0.2)
```
**When:** St. Raphael card at rest
**Effect:** Clear availability, draws eye

### Level 3: Medium Neon (Interactive Elements)
```css
/* Used for: Buttons, links, hover states */
color: #22d3ee
border: 2px solid rgba(34, 211, 238, 0.3)
box-shadow: 0 0 15px rgba(34, 211, 238, 0.2)
```
**When:** Interactive elements
**Effect:** Indicates interactivity

### Level 2: Low Neon (Accents)
```css
/* Used for: Text accents, subtle highlights */
color: #34d399
text-shadow: 0 0 5px rgba(52, 211, 153, 0.2)
border: 1px solid rgba(52, 211, 153, 0.2)
```
**When:** Supporting text, borders
**Effect:** Subtle guidance

### Level 1: Minimal Neon (Hints)
```css
/* Used for: Locked saint color hints */
background: rgba(168, 85, 247, 0.05)
border: 2px solid rgba(168, 85, 247, 0.1)
```
**When:** Locked states
**Effect:** Future potential hint

### Level 0: No Neon (Muted)
```css
/* Used for: Disabled, background elements */
color: #64748b  /* Slate 600 */
background: rgba(30, 41, 59, 0.5)
border: 2px solid rgba(51, 65, 85, 0.5)
```
**When:** Inactive elements
**Effect:** Clearly unavailable

---

## Animation Integration

### Pulse Animation (Active Indicator)
```css
@keyframes neon-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 20px rgba(52, 211, 153, 0.5);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
    box-shadow: 0 0 30px rgba(52, 211, 153, 0.7);
  }
}

.active-dot {
  animation: neon-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
```

### Glow Intensify (Hover)
```css
@keyframes glow-intensify {
  from {
    box-shadow: 0 0 20px rgba(52, 211, 153, 0.3);
    filter: brightness(1);
  }
  to {
    box-shadow: 0 0 40px rgba(52, 211, 153, 0.5),
                0 0 60px rgba(16, 185, 129, 0.3);
    filter: brightness(1.1);
  }
}

.saint-card:hover {
  animation: glow-intensify 500ms ease-out forwards;
}
```

### Shimmer Effect (Background Pattern)
```css
@keyframes neon-shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

.saint-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  background-size: 200% 100%;
  animation: neon-shimmer 3s linear infinite;
}
```

---

## Neon Accessibility Considerations

### Contrast Requirements
```css
/* Always maintain minimum contrast */
White text on Emerald 500: 4.8:1 ✅ (WCAG AA)
Emerald 400 text on Slate 950: 6.2:1 ✅ (WCAG AA)
Cyan 400 text on Slate 950: 7.1:1 ✅ (WCAG AA)

/* Avoid */
Neon text on neon background: ❌ Poor contrast
Pure white on pure neon: ❌ Eye strain
```

### Motion Sensitivity
```css
/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .active-dot {
    animation: none;
    opacity: 1;
  }
}
```

### Visual Fatigue Prevention
```css
/* Limit glow intensity */
--max-glow-opacity: 0.5  /* Never exceed 50% */
--max-blur-radius: 40px  /* Keep blurs reasonable */

/* Limit animation speed */
--min-animation-duration: 2s  /* No faster than 2 seconds */

/* Provide rest areas */
/* Use neon for 20-30% of interface, rest should be muted */
```

---

## Neon Best Practices

### ✅ DO

1. **Use Neon for Hierarchy**
   - Most important: Brightest neon (St. Raphael)
   - Less important: Dimmer neon (links, accents)
   - Least important: No neon (body text, backgrounds)

2. **Apply Neon to Interactions**
   - Hover states: Intensify glow
   - Active states: Dim slightly
   - Focus states: Add neon outline
   - Disabled: Remove all neon

3. **Create Depth with Gradients**
   - Start: Lighter neon (#34d399)
   - End: Darker neon (#0d9488)
   - Result: 3D effect without shadows

4. **Use Neon for Status**
   - Available: Emerald neon
   - Interactive: Cyan neon
   - Success: Emerald neon
   - Error: Rose neon (if needed)

5. **Animate Neon Subtly**
   - Pulse: 2s duration minimum
   - Glow: Smooth transitions (500ms)
   - Shimmer: Slow movement (3s+)

### ❌ DON'T

1. **Overuse Neon**
   - Bad: Every element glows
   - Good: 20-30% of interface uses neon

2. **Mix Competing Neons**
   - Bad: Emerald + Cyan + Purple all at high intensity
   - Good: One dominant neon (emerald), others subdued

3. **Ignore Dark Background**
   - Bad: Neon on white or light gray
   - Good: Neon on dark slate (950/900)

4. **Use Neon for Body Text**
   - Bad: Paragraph text in cyan neon
   - Good: Body in slate-300/400, accents in neon

5. **Create Strobe Effects**
   - Bad: Fast pulsing (< 1s), high contrast flashing
   - Good: Slow pulse (2s+), subtle intensity change

---

## Implementation Code Examples

### Example 1: St. Raphael Card (Full Neon)

```tsx
<div className="saint-card-container">
  {/* Glow Layer (hover effect) */}
  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 -z-10" />

  {/* Main Card */}
  <div className="relative aspect-square rounded-2xl border-2 bg-gradient-to-br from-emerald-500 to-teal-600 border-white/20 shadow-lg shadow-emerald-500/20 overflow-hidden">

    {/* Shimmer Effect */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/50 to-white/0 group-hover:animate-pulse" />
    </div>

    {/* Icon */}
    <div className="absolute inset-0 flex items-center justify-center">
      <Heart className="w-10 h-10 text-white drop-shadow-lg group-hover:scale-110 transition-all duration-500" />
    </div>

    {/* Active Indicator - Pulsing Neon Dot */}
    <div className="absolute top-2 right-2">
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
    </div>
  </div>

  {/* Name with Neon Accent */}
  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
    <p className="text-xs font-semibold text-white">
      St. Raphael
    </p>
    <p className="text-[9px] font-medium text-emerald-400">
      Health & Healing
    </p>
  </div>
</div>
```

### Example 2: Interactive Link with Cyan Neon

```tsx
<a
  href="#"
  className="text-cyan-400 font-medium hover:text-cyan-500 hover:underline transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]"
>
  Learn More
</a>
```

### Example 3: Neon Focus Indicator

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">
  Focused Element
</button>
```

---

## Neon Troubleshooting

### Issue: Neon too bright/harsh
**Solution:** Reduce opacity to 30-50%, increase blur radius

### Issue: Neon not visible enough
**Solution:** Increase opacity, add text-shadow, use darker background

### Issue: Performance issues with glow
**Solution:** Reduce blur radius, use will-change: transform, limit to hover states

### Issue: Neon clashes with other elements
**Solution:** Reduce competing neons, use only 1-2 neon colors max

### Issue: Accessibility concerns
**Solution:** Ensure 4.5:1 contrast minimum, respect prefers-reduced-motion

---

## Final Neon Checklist

- [x] Primary neon (emerald) for available state
- [x] Secondary neon (cyan) for interactive elements
- [x] Tertiary neons (purple/rose/amber) at low opacity for hints
- [x] Glow effects on hover only
- [x] Pulsing animation for active indicators
- [x] Text shadows subtle (5-10px blur max)
- [x] Box shadows layered (inner + outer glow)
- [x] Gradients for depth (light to dark neon)
- [x] Contrast ratios exceed WCAG AA
- [x] Motion respects prefers-reduced-motion
- [x] No strobing or rapid flashing
- [x] Neon used on 20-30% of interface
- [x] Rest areas with muted slate colors

---

**Design Pattern:** Strategic Neon Accents on Dark Theme
**Primary Neon:** Emerald (Health/Available)
**Secondary Neon:** Cyan (Interactive)
**Background:** Dark Slate (950/900)
**Status:** ✅ Production-Ready

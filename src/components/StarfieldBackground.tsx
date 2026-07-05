import { useEffect, useRef } from 'react';
import { StarfieldSim, TIERS, detectTier, nextTierDown, type QualityTier } from '../lib/starfield/engine';
import { drawOverlay, drawStars2d } from '../lib/starfield/render2d';
import { GlStarRenderer } from '../lib/starfield/renderGl';

/**
 * Living night-sky background shared across the app.
 *
 * - Three parallax depth layers of stars drifting on independent paths,
 *   twinkling through eased brightness oscillation, in a cool-to-warm
 *   color temperature range.
 * - Nearest-neighbor constellation lines (per-star cap) that fade in and
 *   out as stars drift, with opacity and width scaled by the combined
 *   brightness of the linked pair.
 * - Pointer proximity brightens nearby stars and draws a temporary
 *   constellation to the pointer; tap or click sends a pulse rippling
 *   outward through the field. Pointer events cover mouse and touch alike.
 * - Rare slow shooting stars on capable devices.
 * - WebGL shader glow for the stars where available, canvas 2D fallback
 *   otherwise; lines and streaks render on a 2D overlay in both modes.
 * - Adaptive quality: device signals pick a starting tier and a frame-time
 *   watchdog steps the tier down instead of letting the frame rate drop.
 * - prefers-reduced-motion renders a finished static sky (no drift, no
 *   streaks, no pulses) and re-renders only on resize or theme of layout
 *   changes.
 * - Pauses via the Page Visibility API and never intercepts pointer input
 *   (both canvases are pointer-events-none; listeners are passive on window).
 */
export default function StarfieldBackground({
  density = 1,
  contained = false,
  interactive = true,
}: {
  density?: number;
  contained?: boolean;
  interactive?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const overlay = document.createElement('canvas');
    const glCanvas = document.createElement('canvas');
    for (const c of [overlay, glCanvas]) {
      c.setAttribute('aria-hidden', 'true');
      c.style.position = 'absolute';
      c.style.inset = '0';
      c.style.width = '100%';
      c.style.height = '100%';
      c.style.pointerEvents = 'none';
    }
    wrap.appendChild(overlay); // lines + pulses + streaks (below)
    wrap.appendChild(glCanvas); // star glow (above, additive)

    const overlayCtx = overlay.getContext('2d');
    if (!overlayCtx) return;

    const reduceQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    let tier: QualityTier = detectTier();
    let glRenderer: GlStarRenderer | null = null;
    let sim: StarfieldSim | null = null;
    let raf = 0;
    let last = 0;
    let running = false;
    let destroyed = false;
    let dpr = 1;
    let cssW = 0;
    let cssH = 0;
    // frame-time watchdog: rolling average, step tier down instead of janking
    let frameAcc = 0;
    let frameCount = 0;
    let lastWatchdogCheck = 0;

    const reduced = () => !!reduceQuery?.matches;

    const setup = () => {
      const cfg = TIERS[tier];
      sim = new StarfieldSim({
        tier,
        density,
        motion: reduced() ? 0 : 1,
        interactive: interactive && !reduced(),
      });
      if (cfg.webgl && !reduced()) {
        glRenderer = glRenderer && !glRenderer.lost ? glRenderer : GlStarRenderer.create(glCanvas);
      } else {
        glRenderer = null;
      }
      glCanvas.style.display = glRenderer ? '' : 'none';
      resize();
    };

    const resize = () => {
      if (!sim) return;
      const cfg = TIERS[tier];
      dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
      cssW = wrap.clientWidth || window.innerWidth;
      cssH = wrap.clientHeight || window.innerHeight;
      overlay.width = Math.max(1, (cssW * dpr) | 0);
      overlay.height = Math.max(1, (cssH * dpr) | 0);
      overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glCanvas.width = Math.max(1, (cssW * dpr) | 0);
      glCanvas.height = Math.max(1, (cssH * dpr) | 0);
      glRenderer?.resize(glCanvas.width, glCanvas.height);
      sim.resize(cssW, cssH);
      if (reduced()) renderStaticFrame();
    };

    const renderFrame = () => {
      if (!sim) return;
      if (glRenderer && !glRenderer.lost) {
        drawOverlay(overlayCtx, sim, interactive);
        glRenderer.draw(sim, dpr, cssW, cssH);
      } else {
        if (glRenderer?.lost) {
          // context lost mid-session: fall back to 2D stars permanently
          glRenderer = null;
          glCanvas.style.display = 'none';
        }
        drawOverlay(overlayCtx, sim, interactive);
        drawStars2d(overlayCtx, sim, TIERS[tier].glow2d);
      }
    };

    // Reduced motion: one finished, intentional frame; no animation loop.
    const renderStaticFrame = () => {
      if (!sim) return;
      sim.step(0.016);
      // settle link fade envelopes so constellation lines show fully
      for (let i = 0; i < 40; i++) sim.step(0.05);
      drawOverlay(overlayCtx, sim, false);
      if (glRenderer && !glRenderer.lost) {
        glRenderer.draw(sim, dpr, cssW, cssH);
      } else {
        drawStars2d(overlayCtx, sim, true);
      }
    };

    const frame = (t: number) => {
      if (destroyed || !running || !sim) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      sim.step(dt);
      renderFrame();

      // watchdog: if the average frame is slow for ~2s, drop a tier
      frameAcc += dt;
      frameCount++;
      if (t - lastWatchdogCheck > 2000) {
        const avg = frameAcc / Math.max(1, frameCount);
        frameAcc = 0;
        frameCount = 0;
        lastWatchdogCheck = t;
        if (avg > 0.026) {
          const down = nextTierDown(tier);
          if (down) {
            tier = down;
            setup();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || destroyed) return;
      if (reduced()) {
        renderStaticFrame();
        return;
      }
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const toLocal = (e: PointerEvent): [number, number] => {
      if (!contained) return [e.clientX, e.clientY];
      const rect = wrap.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onMove = (e: PointerEvent) => {
      if (!sim || reduced() || !interactive) return;
      const [x, y] = toLocal(e);
      sim.setPointer(x, y, true);
      sim.setParallaxTarget((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    const onDown = (e: PointerEvent) => {
      if (!sim || reduced() || !interactive) return;
      const [x, y] = toLocal(e);
      sim.setPointer(x, y, true);
      sim.addPulse(x, y);
    };
    const onUpOrLeave = () => {
      sim?.setPointer(sim.pointerX, sim.pointerY, false);
    };
    const onScroll = () => {
      if (contained) return;
      sim?.setScrollTarget(window.scrollY || window.pageYOffset || 0);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const onReducedChange = () => {
      stop();
      setup();
      start();
    };

    setup();
    onScroll();
    start();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
    ro?.observe(wrap);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUpOrLeave, { passive: true });
    window.addEventListener('pointercancel', onUpOrLeave, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    reduceQuery?.addEventListener?.('change', onReducedChange);

    return () => {
      destroyed = true;
      stop();
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUpOrLeave);
      window.removeEventListener('pointercancel', onUpOrLeave);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      reduceQuery?.removeEventListener?.('change', onReducedChange);
      overlay.remove();
      glCanvas.remove();
    };
  }, [density, contained, interactive]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={`pointer-events-none ${contained ? 'absolute' : 'fixed'} inset-0 z-0 h-full w-full overflow-hidden`}
    />
  );
}

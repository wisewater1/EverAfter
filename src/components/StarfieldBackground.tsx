import { useEffect, useRef } from 'react';

/**
 * A depth-layered starfield rendered on a single fixed canvas behind page
 * content. Stars parallax with the cursor and with scroll (nearer stars move
 * more), and twinkle gently. Designed to sit behind the app's dark-glass
 * panels so the stars shimmer through the frosted glass.
 *
 * Cheap by design: one canvas, DPR capped at 2, star count scaled to viewport,
 * passive listeners, and a single rAF loop. Honors prefers-reduced-motion by
 * drawing a calm, static field with no animation or parallax.
 */
type Hue = 'white' | 'teal' | 'gold';
interface Star {
    x: number;       // base x as a fraction of width (0..1)
    y: number;       // base y as a fraction of height (0..1)
    z: number;       // depth 0..1 — higher is "closer" and parallaxes more
    r: number;       // radius in px
    phase: number;   // twinkle phase offset
    speed: number;   // twinkle speed
    hue: Hue;
}

const HUES: Record<Hue, string> = {
    white: '255, 255, 255',
    teal: '0, 255, 224',   // matches --teal in index.css
    gold: '246, 200, 107', // matches --gold in index.css
};

interface Props {
    /** Multiplier on the auto-computed star count. */
    density?: number;
}

export default function StarfieldBackground({ density = 1 }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const reduceMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let width = 0;
        let height = 0;
        let stars: Star[] = [];
        let raf = 0;

        // Eased pointer (−1..1 from center) and scroll (px) targets.
        let pointerX = 0, pointerY = 0, targetPX = 0, targetPY = 0;
        let scroll = 0, targetScroll = 0;

        const buildStars = () => {
            const count = Math.round(((width * height) / 8000) * density);
            const arr: Star[] = [];
            for (let i = 0; i < count; i++) {
                const z = Math.random();
                const roll = Math.random();
                const hue: Hue = roll > 0.95 ? 'gold' : roll > 0.86 ? 'teal' : 'white';
                arr.push({
                    x: Math.random(),
                    y: Math.random(),
                    z,
                    r: 0.4 + z * 1.5,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.4 + Math.random() * 1.4,
                    hue,
                });
            }
            stars = arr;
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.max(1, Math.floor(width * dpr));
            canvas.height = Math.max(1, Math.floor(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildStars();
        };

        const wrap = (v: number, max: number) => {
            const m = v % max;
            return m < 0 ? m + max : m;
        };

        const draw = (time: number) => {
            ctx.clearRect(0, 0, width, height);
            for (const s of stars) {
                const par = 0.2 + s.z * 1.4; // nearer stars parallax more
                const px = wrap(s.x * width + pointerX * 26 * par, width);
                const py = wrap(
                    s.y * height + pointerY * 26 * par - scroll * 0.18 * par + time * 3 * (0.2 + s.z),
                    height,
                );
                const twinkle = reduceMotion ? 0.85 : 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
                const alpha = (0.25 + s.z * 0.6) * twinkle;
                const rgb = HUES[s.hue];

                if (s.z > 0.78) {
                    // soft glow for the brightest, nearest stars
                    ctx.fillStyle = `rgba(${rgb}, ${(alpha * 0.18).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.arc(px, py, s.r * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(px, py, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const frame = (t: number) => {
            pointerX += (targetPX - pointerX) * 0.05;
            pointerY += (targetPY - pointerY) * 0.05;
            scroll += (targetScroll - scroll) * 0.08;
            draw(t * 0.001);
            raf = requestAnimationFrame(frame);
        };

        const onPointer = (e: PointerEvent) => {
            targetPX = (e.clientX / window.innerWidth) * 2 - 1;
            targetPY = (e.clientY / window.innerHeight) * 2 - 1;
        };
        const onScroll = () => {
            targetScroll = window.scrollY || window.pageYOffset || 0;
        };

        resize();
        window.addEventListener('resize', resize);

        if (reduceMotion) {
            // Calm, static field — no parallax, no animation loop.
            draw(0);
        } else {
            onScroll();
            window.addEventListener('pointermove', onPointer, { passive: true });
            window.addEventListener('scroll', onScroll, { passive: true });
            raf = requestAnimationFrame(frame);
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('scroll', onScroll);
        };
    }, [density]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 h-full w-full"
        />
    );
}

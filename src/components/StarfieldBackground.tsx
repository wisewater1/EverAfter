import { useEffect, useRef } from 'react';

/**
 * Interactive constellation background on a single fixed canvas.
 *
 * - Stars drift continuously (visible, ambient motion) and twinkle.
 * - Near the pointer (mouse OR finger) they link to it with glowing lines and
 *   a soft light follows the cursor — the obvious "interactive" cue.
 * - Nearby stars link to each other into a shifting network.
 * - The whole field parallaxes with cursor position and with scroll.
 *
 * Motion is intentionally kept ON even under prefers-reduced-motion (just
 * gentler / no twinkle), because the background being alive is the point here;
 * a fully static fallback read as "broken" to users.
 */
type Hue = 'white' | 'teal' | 'gold';
const HUES: Record<Hue, [number, number, number]> = {
    white: [255, 255, 255],
    teal: [80, 240, 255],
    gold: [246, 200, 107],
};

interface P {
    x: number; y: number;   // base position (px), drifts + wraps
    vx: number; vy: number; // velocity px/sec
    r: number; z: number;   // radius, depth 0..1
    phase: number; speed: number;
    hue: Hue;
}

export default function StarfieldBackground({ density = 1 }: { density?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const reduce =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const motion = reduce ? 0.45 : 1; // dampen, don't disable

        let W = 0, H = 0, raf = 0, last = 0;
        let parts: P[] = [];
        let mx = -1, my = -1, haveMouse = false;          // pointer in css px
        let pX = 0, pY = 0, tpX = 0, tpY = 0;             // centered parallax −1..1
        let scroll = 0, tScroll = 0;

        const LINK = 132;   // star↔star link distance
        const MOUSE_R = 210; // pointer interaction radius

        const build = () => {
            const target = Math.round(((W * H) / 13000) * density);
            const count = Math.max(34, Math.min(150, target));
            const arr: P[] = [];
            for (let i = 0; i < count; i++) {
                const z = Math.random();
                const roll = Math.random();
                const hue: Hue = roll > 0.92 ? 'gold' : roll > 0.8 ? 'teal' : 'white';
                const sp = (10 + Math.random() * 16) * (0.4 + z) * motion; // px/sec
                const ang = Math.random() * Math.PI * 2;
                arr.push({
                    x: Math.random() * W, y: Math.random() * H,
                    vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
                    r: 0.7 + z * 1.9, z,
                    phase: Math.random() * 6.283, speed: 0.5 + Math.random() * 1.4,
                    hue,
                });
            }
            parts = arr;
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth; H = canvas.clientHeight;
            canvas.width = Math.max(1, (W * dpr) | 0);
            canvas.height = Math.max(1, (H * dpr) | 0);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
        };

        const wrap = (v: number, m: number) => { const r = v % m; return r < 0 ? r + m : r; };

        const rx: number[] = [], ry: number[] = [];
        const frame = (t: number) => {
            const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
            last = t;
            pX += (tpX - pX) * 0.06; pY += (tpY - pY) * 0.06;
            scroll += (tScroll - scroll) * 0.08;
            const time = t * 0.001;
            ctx.clearRect(0, 0, W, H);

            for (let i = 0; i < parts.length; i++) {
                const s = parts[i];
                s.x = wrap(s.x + s.vx * dt, W);
                s.y = wrap(s.y + s.vy * dt, H);
                const par = 0.3 + s.z * 1.7;
                rx[i] = wrap(s.x + pX * 34 * par, W);
                ry[i] = wrap(s.y + pY * 34 * par - scroll * 0.16 * par, H);
            }

            // star ↔ star network
            ctx.lineWidth = 1;
            for (let i = 0; i < parts.length; i++) {
                for (let j = i + 1; j < parts.length; j++) {
                    const dx = rx[i] - rx[j], dy = ry[i] - ry[j];
                    const d2 = dx * dx + dy * dy;
                    if (d2 < LINK * LINK) {
                        const a = (1 - Math.sqrt(d2) / LINK) * 0.22;
                        ctx.strokeStyle = `rgba(120, 190, 255, ${a.toFixed(3)})`;
                        ctx.beginPath(); ctx.moveTo(rx[i], ry[i]); ctx.lineTo(rx[j], ry[j]); ctx.stroke();
                    }
                }
            }

            // pointer light + links
            if (haveMouse) {
                const g = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_R);
                g.addColorStop(0, 'rgba(80, 240, 255, 0.13)');
                g.addColorStop(1, 'rgba(80, 240, 255, 0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(mx, my, MOUSE_R, 0, 6.283); ctx.fill();
                for (let i = 0; i < parts.length; i++) {
                    const dx = rx[i] - mx, dy = ry[i] - my;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < MOUSE_R * MOUSE_R) {
                        const a = (1 - Math.sqrt(d2) / MOUSE_R) * 0.55;
                        ctx.strokeStyle = `rgba(90, 245, 255, ${a.toFixed(3)})`;
                        ctx.beginPath(); ctx.moveTo(rx[i], ry[i]); ctx.lineTo(mx, my); ctx.stroke();
                    }
                }
            }

            // stars
            for (let i = 0; i < parts.length; i++) {
                const s = parts[i];
                const tw = reduce ? 0.95 : 0.6 + 0.4 * Math.sin(time * s.speed + s.phase);
                const a = Math.min(1, (0.58 + s.z * 0.5) * tw);
                const [R, G, B] = HUES[s.hue];
                // Soft two-layer bloom around the nearer stars — gives the whole
                // app a gentle ambient glow (kept subtle so it never overwhelms).
                if (s.z > 0.5) {
                    ctx.fillStyle = `rgba(${R}, ${G}, ${B}, ${(a * 0.10).toFixed(3)})`;
                    ctx.beginPath(); ctx.arc(rx[i], ry[i], s.r * 5.2, 0, 6.283); ctx.fill();
                    ctx.fillStyle = `rgba(${R}, ${G}, ${B}, ${(a * 0.26).toFixed(3)})`;
                    ctx.beginPath(); ctx.arc(rx[i], ry[i], s.r * 3.2, 0, 6.283); ctx.fill();
                }
                ctx.fillStyle = `rgba(${R}, ${G}, ${B}, ${a.toFixed(3)})`;
                ctx.beginPath(); ctx.arc(rx[i], ry[i], s.r, 0, 6.283); ctx.fill();
            }

            raf = requestAnimationFrame(frame);
        };

        const onMove = (e: PointerEvent) => {
            mx = e.clientX; my = e.clientY; haveMouse = true;
            tpX = (e.clientX / window.innerWidth) * 2 - 1;
            tpY = (e.clientY / window.innerHeight) * 2 - 1;
        };
        const onLeave = () => { haveMouse = false; };
        const onScroll = () => { tScroll = window.scrollY || window.pageYOffset || 0; };

        resize();
        onScroll();
        window.addEventListener('resize', resize);
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerdown', onMove, { passive: true });
        window.addEventListener('pointerleave', onLeave);
        window.addEventListener('scroll', onScroll, { passive: true });
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onMove);
            window.removeEventListener('pointerleave', onLeave);
            window.removeEventListener('scroll', onScroll);
        };
    }, [density]);

    return (
        <canvas
            ref={ref}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 h-full w-full"
        />
    );
}

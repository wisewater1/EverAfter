/**
 * Canvas 2D rendering for the starfield.
 *
 * Two jobs:
 *  - drawOverlay: constellation lines, pointer light, pulse rings, and
 *    shooting stars. Always drawn in 2D (variable-width anti-aliased lines
 *    and gradients are much better here than in GL) on the overlay canvas.
 *  - drawStars2d: the star discs with a two-ring halo, used when the WebGL
 *    renderer is unavailable or the quality tier is 'low'.
 */

import type { StarfieldSim } from './engine';

const POINTER_GLOW_R = 220;

export function drawOverlay(ctx: CanvasRenderingContext2D, sim: StarfieldSim, interactive: boolean) {
  const { W, H } = sim;
  ctx.clearRect(0, 0, W, H);

  // constellation links
  const lines = sim.lines;
  for (let i = 0; i < sim.lineCount; i++) {
    const l = lines[i];
    ctx.strokeStyle = `rgba(${l.r}, ${l.g}, ${l.b}, ${l.a.toFixed(3)})`;
    ctx.lineWidth = l.w;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  }

  // pointer light + temporary constellation toward the pointer
  if (interactive && sim.pointerEnv > 0.02) {
    const px = sim.pointerX;
    const py = sim.pointerY;
    const env = sim.pointerEnv;
    const g = ctx.createRadialGradient(px, py, 0, px, py, POINTER_GLOW_R);
    g.addColorStop(0, `rgba(80, 240, 255, ${(0.12 * env).toFixed(3)})`);
    g.addColorStop(1, 'rgba(80, 240, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, POINTER_GLOW_R, 0, 6.283);
    ctx.fill();

    const stars = sim.stars;
    ctx.lineWidth = 1;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const dx = s.sx - px;
      const dy = s.sy - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < POINTER_GLOW_R * POINTER_GLOW_R) {
        const k = 1 - Math.sqrt(d2) / POINTER_GLOW_R;
        const a = k * k * 0.5 * env * (0.4 + s.a * 0.6);
        if (a < 0.01) continue;
        ctx.strokeStyle = `rgba(120, 235, 255, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(s.sx, s.sy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }
  }

  // pulse rings (soft expanding glow after a tap/click)
  for (const p of sim.pulses) {
    const k = Math.min(1, p.age / 1.5);
    const eased = 1 - Math.pow(1 - k, 3);
    const ringR = eased * 460;
    const alpha = Math.pow(1 - k, 1.6) * 0.35;
    if (alpha < 0.01 || ringR < 2) continue;
    const grad = ctx.createRadialGradient(p.x, p.y, Math.max(0, ringR - 46), p.x, p.y, ringR + 46);
    grad.addColorStop(0, 'rgba(246, 200, 107, 0)');
    grad.addColorStop(0.5, `rgba(210, 225, 255, ${alpha.toFixed(3)})`);
    grad.addColorStop(1, 'rgba(80, 240, 255, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, 0, 6.283);
    ctx.stroke();
  }

  // shooting stars: bright head with a fading gradient tail
  for (const m of sim.shooting) {
    const k = m.age / m.life;
    const envelope = Math.pow(Math.sin(Math.PI * Math.min(1, k)), 0.75);
    if (envelope <= 0.01) continue;
    const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy) || 1;
    const tail = 0.16 * speed; // ~160ms of travel
    const tx = m.x - (m.vx / speed) * tail;
    const ty = m.y - (m.vy / speed) * tail;
    const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
    grad.addColorStop(0, `rgba(255, 250, 240, ${(0.85 * envelope).toFixed(3)})`);
    grad.addColorStop(0.35, `rgba(190, 220, 255, ${(0.4 * envelope).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(190, 220, 255, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 252, 245, ${(0.9 * envelope).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.6, 0, 6.283);
    ctx.fill();
  }
}

/** Star discs with halo, for the non-WebGL path. */
export function drawStars2d(ctx: CanvasRenderingContext2D, sim: StarfieldSim, glow: boolean) {
  const stars = sim.stars;
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const a = s.a;
    if (a <= 0.01) continue;
    if (glow && s.r > 1.1) {
      ctx.fillStyle = `rgba(${s.cr}, ${s.cg}, ${s.cb}, ${(a * 0.09).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, s.r * 5, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = `rgba(${s.cr}, ${s.cg}, ${s.cb}, ${(a * 0.22).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, s.r * 2.7, 0, 6.283);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${s.cr}, ${s.cg}, ${s.cb}, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, s.r, 0, 6.283);
    ctx.fill();
  }
}

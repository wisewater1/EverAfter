/**
 * Living night-sky simulation shared by every StarfieldBackground surface.
 *
 * Pure simulation: no DOM, no React. The component layer owns canvases and
 * event wiring; renderers (render2d / renderGl) consume the frame buffers
 * this module fills. Keeping the sim allocation-free per frame (reused
 * typed-ish arrays, pair-fade map) is what lets mid-range mobile hold 60fps.
 */

export type QualityTier = 'high' | 'mid' | 'low';

export interface TierConfig {
  layerCount: 2 | 3;
  minStars: number;
  maxStars: number;
  /** css px^2 of viewport per star before density multiplier */
  areaPerStar: number;
  maxDpr: number;
  webgl: boolean;
  shootingStars: boolean;
  /** 2D halo blobs when WebGL glow is unavailable */
  glow2d: boolean;
}

export const TIERS: Record<QualityTier, TierConfig> = {
  high: { layerCount: 3, minStars: 90, maxStars: 260, areaPerStar: 8200, maxDpr: 2, webgl: true, shootingStars: true, glow2d: true },
  mid: { layerCount: 3, minStars: 60, maxStars: 150, areaPerStar: 11000, maxDpr: 1.5, webgl: true, shootingStars: true, glow2d: true },
  low: { layerCount: 2, minStars: 40, maxStars: 90, areaPerStar: 15000, maxDpr: 1, webgl: false, shootingStars: false, glow2d: false },
};

const TIER_ORDER: QualityTier[] = ['high', 'mid', 'low'];

export function nextTierDown(tier: QualityTier): QualityTier | null {
  const i = TIER_ORDER.indexOf(tier);
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
}

/** Pick a starting tier from device signals; the runtime watchdog can still step down. */
export function detectTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'mid';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory || 8;
  const coarse =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  if (cores <= 3 || mem <= 2) return 'low';
  if (coarse || cores <= 6 || mem <= 4) return 'mid';
  return 'high';
}

interface LayerConfig {
  share: number;
  rMin: number;
  rMax: number;
  bMin: number;
  bMax: number;
  /** base drift speed px/s */
  drift: number;
  /** pointer/scroll parallax travel in px */
  parallax: number;
  /** stars in this layer participate in constellation links */
  links: boolean;
}

// far -> near. Far stars: many, dim, slow. Near stars: few, bright, faster.
const LAYERS: LayerConfig[] = [
  { share: 0.52, rMin: 0.35, rMax: 0.95, bMin: 0.3, bMax: 0.58, drift: 3.2, parallax: 9, links: false },
  { share: 0.3, rMin: 0.65, rMax: 1.7, bMin: 0.48, bMax: 0.8, drift: 6.5, parallax: 22, links: true },
  { share: 0.18, rMin: 1.05, rMax: 2.7, bMin: 0.62, bMax: 1.0, drift: 11.5, parallax: 38, links: true },
];

// Color temperature ramp: cool pale blue-white -> neutral -> warm pale gold.
const COOL: [number, number, number] = [176, 205, 255];
const MID: [number, number, number] = [236, 241, 255];
const WARM: [number, number, number] = [255, 215, 150];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function starColor(rand: () => number): [number, number, number] {
  const t = Math.pow(rand(), 1.1); // slight bias toward the cool half
  if (t < 0.55) {
    const k = t / 0.55;
    return [lerp(COOL[0], MID[0], k), lerp(COOL[1], MID[1], k), lerp(COOL[2], MID[2], k)];
  }
  const k = (t - 0.55) / 0.45;
  return [lerp(MID[0], WARM[0], k), lerp(MID[1], WARM[1], k), lerp(MID[2], WARM[2], k)];
}

export interface Star {
  layer: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  baseB: number;
  cr: number;
  cg: number;
  cb: number;
  p1: number;
  s1: number;
  p2: number;
  s2: number;
  /** transient brightness from pulses, decays each frame */
  boost: number;
  // per-frame outputs
  sx: number;
  sy: number;
  /** final alpha 0..1 for this frame */
  a: number;
}

export interface LineSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  a: number;
  w: number;
  r: number;
  g: number;
  b: number;
}

export interface Pulse {
  x: number;
  y: number;
  age: number;
}

export interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

export interface SimOptions {
  tier: QualityTier;
  density: number;
  /** 0..1 global motion scale; reduced-motion callers pass 0 and render once */
  motion: number;
  interactive: boolean;
}

const LINK_DIST = 148;
const MAX_LINKS_PER_STAR = 3;
const POINTER_R = 220;
const PULSE_LIFE = 1.5;
const PULSE_MAX_R = 460;
const PULSE_BAND = 78;
const MAX_PULSES = 4;
const SHOOT_INTERVAL_MIN = 5;
const SHOOT_INTERVAL_SPAN = 8;
const MAX_CONCURRENT_SHOOTING = 2;

export class StarfieldSim {
  W = 0;
  H = 0;
  stars: Star[] = [];
  lines: LineSeg[] = [];
  lineCount = 0;
  pulses: Pulse[] = [];
  shooting: ShootingStar[] = [];
  pointerX = -1;
  pointerY = -1;
  /** eased 0..1 pointer presence so interaction fades in/out */
  pointerEnv = 0;
  pointerActive = false;
  time = 0;

  private opts: SimOptions;
  private tierCfg: TierConfig;
  private tpX = 0;
  private tpY = 0;
  private pX = 0;
  private pY = 0;
  private tScroll = 0;
  private scroll = 0;
  private nextShootAt = 0;
  private linkCounts: number[] = [];
  /** pair key -> fade envelope 0..1 so links never snap on/off */
  private pairFade = new Map<number, { env: number; active: boolean }>();
  private grid = new Map<number, number[]>();
  private candidates: { i: number; j: number; d: number }[] = [];

  constructor(opts: SimOptions) {
    this.opts = opts;
    this.tierCfg = TIERS[opts.tier];
  }

  get tier(): QualityTier {
    return this.opts.tier;
  }

  resize(w: number, h: number) {
    this.W = w;
    this.H = h;
    this.build();
  }

  setParallaxTarget(nx: number, ny: number) {
    this.tpX = nx;
    this.tpY = ny;
  }

  setScrollTarget(y: number) {
    this.tScroll = y;
  }

  setPointer(x: number, y: number, active: boolean) {
    this.pointerX = x;
    this.pointerY = y;
    this.pointerActive = active;
  }

  addPulse(x: number, y: number) {
    if (this.opts.motion === 0) return;
    if (this.pulses.length >= MAX_PULSES) this.pulses.shift();
    this.pulses.push({ x, y, age: 0 });
  }

  private activeLayers(): LayerConfig[] {
    return this.tierCfg.layerCount === 3 ? LAYERS : [LAYERS[0], LAYERS[2]];
  }

  private build() {
    const { W, H } = this;
    if (W <= 0 || H <= 0) return;
    const cfg = this.tierCfg;
    const target = Math.round(((W * H) / cfg.areaPerStar) * this.opts.density);
    const count = Math.max(cfg.minStars, Math.min(cfg.maxStars, target));
    const layers = this.activeLayers();
    const shareTotal = layers.reduce((s, l) => s + l.share, 0);
    const rand = Math.random;
    const stars: Star[] = [];
    layers.forEach((layer, li) => {
      const n = Math.max(4, Math.round((count * layer.share) / shareTotal));
      for (let i = 0; i < n; i++) {
        // Power-law size: many small dim stars, few large bright ones.
        const u = Math.pow(rand(), 2.2);
        const r = layer.rMin + (layer.rMax - layer.rMin) * u;
        const baseB = layer.bMin + (layer.bMax - layer.bMin) * (u * 0.65 + rand() * 0.35);
        const [cr, cg, cb] = starColor(rand);
        const ang = rand() * Math.PI * 2;
        const sp = layer.drift * (0.55 + rand() * 0.9) * this.opts.motion;
        stars.push({
          layer: li,
          x: rand() * W,
          y: rand() * H,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          r,
          baseB,
          cr,
          cg,
          cb,
          p1: rand() * 6.283,
          s1: 0.35 + rand() * 0.9,
          p2: rand() * 6.283,
          s2: 1.1 + rand() * 1.6,
          boost: 0,
          sx: 0,
          sy: 0,
          a: 0,
        });
      }
    });
    this.stars = stars;
    this.linkCounts = new Array(stars.length).fill(0);
    this.pairFade.clear();
    this.lines = [];
    this.lineCount = 0;
    this.nextShootAt = this.time + 4 + Math.random() * 8;
  }

  private wrap(v: number, m: number) {
    const r = v % m;
    return r < 0 ? r + m : r;
  }

  /** Advance the world and fill stars[].sx/sy/a, lines, pulses, shooting stars. */
  step(dt: number) {
    this.time += dt;
    const { W, H, stars } = this;
    if (W <= 0 || H <= 0 || stars.length === 0) return;
    const t = this.time;
    const ease = Math.min(1, dt * 4);
    this.pX += (this.tpX - this.pX) * ease;
    this.pY += (this.tpY - this.pY) * ease;
    this.scroll += (this.tScroll - this.scroll) * Math.min(1, dt * 5);
    this.pointerEnv += ((this.pointerActive ? 1 : 0) - this.pointerEnv) * Math.min(1, dt * 6);

    const layers = this.activeLayers();

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const layer = layers[s.layer];
      s.x = this.wrap(s.x + s.vx * dt, W);
      s.y = this.wrap(s.y + s.vy * dt, H);
      s.sx = this.wrap(s.x + this.pX * layer.parallax, W);
      s.sy = this.wrap(s.y + this.pY * layer.parallax - this.scroll * 0.004 * layer.parallax, H);
      s.boost *= Math.exp(-dt * 2.4);
      // Two offset sines make an organic, eased shimmer instead of a blink.
      const tw = 0.66 + 0.34 * (0.62 * Math.sin(t * s.s1 + s.p1) + 0.38 * Math.sin(t * s.s2 + s.p2));
      let a = s.baseB * (this.opts.motion === 0 ? 0.9 : tw) + s.boost;
      if (this.pointerEnv > 0.02 && this.opts.interactive) {
        const dx = s.sx - this.pointerX;
        const dy = s.sy - this.pointerY;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_R * POINTER_R) {
          const k = 1 - Math.sqrt(d2) / POINTER_R;
          a += k * k * 0.55 * this.pointerEnv;
        }
      }
      s.a = Math.min(1, a);
    }

    this.stepPulses(dt);
    this.stepShooting(dt);
    this.buildLinks(dt);
  }

  private stepPulses(dt: number) {
    const { stars } = this;
    for (let p = this.pulses.length - 1; p >= 0; p--) {
      const pulse = this.pulses[p];
      pulse.age += dt;
      const k = pulse.age / PULSE_LIFE;
      if (k >= 1) {
        this.pulses.splice(p, 1);
        continue;
      }
      const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic expansion
      const ringR = eased * PULSE_MAX_R;
      const strength = Math.pow(1 - k, 1.4);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const dx = s.sx - pulse.x;
        const dy = s.sy - pulse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const band = Math.abs(d - ringR);
        if (band < PULSE_BAND) {
          const hit = (1 - band / PULSE_BAND) * strength * 0.9;
          if (hit > s.boost) s.boost = hit;
        }
      }
    }
  }

  private stepShooting(dt: number) {
    if (!this.tierCfg.shootingStars || this.opts.motion === 0) return;
    for (let i = this.shooting.length - 1; i >= 0; i--) {
      const m = this.shooting[i];
      m.age += dt;
      if (m.age >= m.life) {
        this.shooting.splice(i, 1);
        continue;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
    if (this.time >= this.nextShootAt && this.shooting.length < MAX_CONCURRENT_SHOOTING) {
      // Ambient streak crossing part of the sky - varies in size/speed/reach
      // so they don't all look identical.
      const fromLeft = Math.random() > 0.5;
      const scale = 0.75 + Math.random() * 0.6; // small-quick to big-sweeping
      const speed = (380 + Math.random() * 240) * scale;
      const ang = (14 + Math.random() * 26) * (Math.PI / 180);
      const vx = Math.cos(ang) * speed * (fromLeft ? 1 : -1);
      const vy = Math.sin(ang) * speed;
      this.shooting.push({
        x: fromLeft ? -40 + Math.random() * this.W * 0.35 : this.W * 0.65 + Math.random() * (this.W * 0.35 + 40),
        y: Math.random() * this.H * 0.55,
        vx,
        vy,
        age: 0,
        life: (1.2 + Math.random() * 0.9) * scale,
      });
      this.nextShootAt = this.time + SHOOT_INTERVAL_MIN + Math.random() * SHOOT_INTERVAL_SPAN;
    }
  }

  /**
   * Nearest-neighbor constellation links with a per-star cap so clusters stay
   * readable, plus a per-pair fade envelope so lines ease in/out instead of
   * snapping when the neighbor set changes.
   */
  private buildLinks(dt: number) {
    const { stars } = this;
    const n = stars.length;
    this.lineCount = 0;
    const cell = LINK_DIST;
    this.grid.clear();
    for (let i = 0; i < n; i++) {
      const s = stars[i];
      if (!this.activeLayers()[s.layer].links) continue;
      const key = Math.floor(s.sx / cell) * 4096 + Math.floor(s.sy / cell);
      let bucket = this.grid.get(key);
      if (!bucket) {
        bucket = [];
        this.grid.set(key, bucket);
      }
      bucket.push(i);
    }
    this.candidates.length = 0;
    for (const [key, bucket] of this.grid) {
      const cx = Math.floor(key / 4096);
      const cy = key - cx * 4096;
      for (let bi = 0; bi < bucket.length; bi++) {
        const i = bucket[bi];
        const si = stars[i];
        // own cell (forward pairs only) + east/south neighbors to avoid dupes
        for (let bj = bi + 1; bj < bucket.length; bj++) this.tryPair(i, bucket[bj], si);
        for (let ox = 0; ox <= 1; ox++) {
          for (let oy = ox === 0 ? 1 : -1; oy <= 1; oy++) {
            const other = this.grid.get((cx + ox) * 4096 + (cy + oy));
            if (other) for (let bj = 0; bj < other.length; bj++) this.tryPair(i, other[bj], si);
          }
        }
      }
    }
    this.candidates.sort((a, b) => a.d - b.d);
    this.linkCounts.fill(0);
    const selected = new Set<number>();
    for (const c of this.candidates) {
      if (this.linkCounts[c.i] >= MAX_LINKS_PER_STAR || this.linkCounts[c.j] >= MAX_LINKS_PER_STAR) continue;
      this.linkCounts[c.i]++;
      this.linkCounts[c.j]++;
      selected.add(c.i * 65536 + c.j);
    }
    // advance fade envelopes
    for (const key of selected) {
      let f = this.pairFade.get(key);
      if (!f) {
        f = { env: 0, active: true };
        this.pairFade.set(key, f);
      }
      f.active = true;
    }
    const fadeIn = Math.min(1, dt * 3.2);
    const fadeOut = Math.min(1, dt * 2.4);
    for (const [key, f] of this.pairFade) {
      if (!selected.has(key)) f.active = false;
      f.env += ((f.active ? 1 : 0) - f.env) * (f.active ? fadeIn : fadeOut);
      if (!f.active && f.env < 0.02) {
        this.pairFade.delete(key);
        continue;
      }
      const i = Math.floor(key / 65536);
      const j = key - i * 65536;
      if (i >= stars.length || j >= stars.length) {
        this.pairFade.delete(key);
        continue;
      }
      const si = stars[i];
      const sj = stars[j];
      const dx = si.sx - sj.sx;
      const dy = si.sy - sj.sy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > LINK_DIST * 1.35) {
        this.pairFade.delete(key);
        continue;
      }
      const closeness = Math.max(0, 1 - d / LINK_DIST);
      const bright = (si.a + sj.a) * 0.5;
      // Opacity and width both scale with the combined brightness of the pair.
      const a = closeness * closeness * (0.16 + bright * 0.34) * f.env;
      if (a < 0.008) continue;
      let seg = this.lines[this.lineCount];
      if (!seg) {
        seg = { x1: 0, y1: 0, x2: 0, y2: 0, a: 0, w: 1, r: 0, g: 0, b: 0 };
        this.lines[this.lineCount] = seg;
      }
      seg.x1 = si.sx;
      seg.y1 = si.sy;
      seg.x2 = sj.sx;
      seg.y2 = sj.sy;
      seg.a = a;
      seg.w = 0.6 + bright * 0.9;
      seg.r = 130;
      seg.g = 196;
      seg.b = 255;
      this.lineCount++;
    }
  }

  private tryPair(i: number, j: number, si: Star) {
    const sj = this.stars[j];
    if (si.layer !== sj.layer) return; // constellations live at one depth
    const dx = si.sx - sj.sx;
    const dy = si.sy - sj.sy;
    const d2 = dx * dx + dy * dy;
    if (d2 < LINK_DIST * LINK_DIST) {
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      this.candidates.push({ i: a, j: b, d: Math.sqrt(d2) });
    }
  }
}

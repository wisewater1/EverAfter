/**
 * WebGL star renderer: every star is a point sprite whose fragment shader
 * draws an anti-aliased core plus a gaussian halo, blended additively so
 * bright stars genuinely bloom. Lines/pulses/shooting stars stay on the 2D
 * overlay canvas (drawn by render2d.drawOverlay) where variable-width
 * anti-aliased strokes are cheap.
 */

import type { StarfieldSim } from './engine';

const VERT = `
attribute vec2 aPos;
attribute float aSize;
attribute vec4 aColor;
uniform vec2 uRes;
varying vec4 vColor;
void main() {
  vec2 clip = (aPos / uRes) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = aSize;
  vColor = aColor;
}
`;

const FRAG = `
precision mediump float;
varying vec4 vColor;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = length(uv);
  if (d > 1.0) discard;
  float core = 1.0 - smoothstep(0.14, 0.26, d);
  float halo = exp(-d * d * 4.5) * 0.5;
  vec3 col = mix(vColor.rgb, vec3(1.0), core * 0.5);
  float a = (core + halo) * vColor.a;
  gl_FragColor = vec4(col * a, a);
}
`;

const FLOATS_PER_STAR = 7; // x, y, size, r, g, b, a
const GLOW_MULT = 9;

export class GlStarRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private data: Float32Array;
  private uRes: WebGLUniformLocation | null;
  private aPos: number;
  private aSize: number;
  private aColor: number;
  private maxPointSize: number;
  lost = false;

  static create(canvas: HTMLCanvasElement): GlStarRenderer | null {
    try {
      const gl =
        (canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true }) as WebGLRenderingContext | null) ||
        (canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: true }) as WebGLRenderingContext | null);
      if (!gl) return null;
      return new GlStarRenderer(canvas, gl);
    } catch {
      return null;
    }
  }

  private constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.gl = gl;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error('shader alloc failed');
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
      }
      return sh;
    };
    const program = gl.createProgram();
    if (!program) throw new Error('program alloc failed');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
    }
    this.program = program;
    gl.useProgram(program);
    this.uRes = gl.getUniformLocation(program, 'uRes');
    this.aPos = gl.getAttribLocation(program, 'aPos');
    this.aSize = gl.getAttribLocation(program, 'aSize');
    this.aColor = gl.getAttribLocation(program, 'aColor');
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('buffer alloc failed');
    this.buffer = buffer;
    this.data = new Float32Array(0);
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | number[];
    this.maxPointSize = Array.isArray(range) || range instanceof Float32Array ? Number(range[1]) || 64 : 64;
    // Premultiplied additive: light accumulates, destination alpha saturates.
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        this.lost = true;
      },
      false,
    );
  }

  /** Resize the drawing buffer (device px) and viewport. */
  resize(widthPx: number, heightPx: number) {
    this.gl.viewport(0, 0, widthPx, heightPx);
  }

  draw(sim: StarfieldSim, dpr: number, cssW: number, cssH: number) {
    if (this.lost) return;
    const gl = this.gl;
    const stars = sim.stars;
    const needed = stars.length * FLOATS_PER_STAR;
    if (this.data.length < needed) this.data = new Float32Array(needed);
    const d = this.data;
    let n = 0;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      if (s.a <= 0.01) continue;
      const base = n * FLOATS_PER_STAR;
      d[base] = s.sx * dpr;
      d[base + 1] = s.sy * dpr;
      d[base + 2] = Math.min(this.maxPointSize, s.r * GLOW_MULT * dpr);
      d[base + 3] = s.cr / 255;
      d[base + 4] = s.cg / 255;
      d[base + 5] = s.cb / 255;
      d[base + 6] = s.a;
      n++;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (n === 0) return;

    gl.useProgram(this.program);
    gl.uniform2f(this.uRes, cssW * dpr, cssH * dpr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, d.subarray(0, n * FLOATS_PER_STAR), gl.DYNAMIC_DRAW);
    const stride = FLOATS_PER_STAR * 4;
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.aSize);
    gl.vertexAttribPointer(this.aSize, 1, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, stride, 12);
    gl.drawArrays(gl.POINTS, 0, n);
  }
}

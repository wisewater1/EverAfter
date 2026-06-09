export function scaleCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const { clientWidth: w, clientHeight: h } = canvas;

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return ctx;
}

export function getDevicePixelRatio(): number {
  return Math.max(1, Math.min(3, window.devicePixelRatio || 1));
}

export function isHighDPIDevice(): boolean {
  return getDevicePixelRatio() >= 2;
}

export function getOptimalImageSize(baseWidth: number, baseHeight: number): { width: number; height: number } {
  const dpr = getDevicePixelRatio();
  return {
    width: Math.round(baseWidth * dpr),
    height: Math.round(baseHeight * dpr)
  };
}

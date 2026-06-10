import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, Grid, ZoomIn, Ruler, CheckCircle, AlertCircle, Info, Eye } from 'lucide-react';
import { scaleCanvas, getDevicePixelRatio } from '../lib/canvas-utils';

interface DeviceMetrics {
  screenWidth: number;
  screenHeight: number;
  innerWidth: number;
  innerHeight: number;
  visualWidth: number;
  visualHeight: number;
  dpr: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  safeAreaLeft: number;
  safeAreaRight: number;
  orientation: string;
  touchPoints: number;
  userAgent: string;
  platform: string;
  zoomLevel: number;
}

export default function DeviceCheck() {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    window.addEventListener('orientationchange', updateMetrics);

    return () => {
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('orientationchange', updateMetrics);
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      drawTestPattern();
    }
  }, [metrics]);

  const updateMetrics = () => {
    const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-top') || '0');
    const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom') || '0');
    const safeLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-left') || '0');
    const safeRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-right') || '0');

    const visualViewport = window.visualViewport;
    const zoomLevel = visualViewport ? Math.round((visualViewport.scale || 1) * 100) : 100;

    setMetrics({
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualWidth: visualViewport?.width || window.innerWidth,
      visualHeight: visualViewport?.height || window.innerHeight,
      dpr: getDevicePixelRatio(),
      safeAreaTop: safeTop,
      safeAreaBottom: safeBottom,
      safeAreaLeft: safeLeft,
      safeAreaRight: safeRight,
      orientation: window.screen.orientation?.type || 'unknown',
      touchPoints: navigator.maxTouchPoints || 0,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      zoomLevel
    });
  };

  const drawTestPattern = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = scaleCanvas(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.strokeStyle = '#00ffe0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.clientHeight / 2);
    ctx.lineTo(canvas.clientWidth, canvas.clientHeight / 2);
    ctx.moveTo(canvas.clientWidth / 2, 0);
    ctx.lineTo(canvas.clientWidth / 2, canvas.clientHeight);
    ctx.stroke();

    ctx.strokeStyle = '#00ffe0';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.clientWidth - 20, canvas.clientHeight - 20);

    ctx.fillStyle = '#00ffe0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`DPR: ${getDevicePixelRatio()}x`, canvas.clientWidth / 2, 30);
    ctx.fillText('Test Pattern - Should be crisp', canvas.clientWidth / 2, canvas.clientHeight - 20);

    for (let i = 0; i < 10; i++) {
      const x = (canvas.clientWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 10);
      ctx.stroke();
    }
  };

  const checkStatus = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="w-5 h-5 text-green-400" />
    ) : (
      <AlertCircle className="w-5 h-5 text-yellow-400" />
    );
  };

  if (!metrics) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white">Loading device metrics...</div>
      </div>
    );
  }

  const isMobile = metrics.touchPoints > 0;
  const isNotched = metrics.safeAreaTop > 20 || metrics.safeAreaBottom > 20;
  const isHighDPI = metrics.dpr >= 2;
  const isZoomed = metrics.zoomLevel !== 100;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px]"></div>
      </div>

      {showGrid && (
        <div className="fixed inset-0 pointer-events-none z-50" style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0,255,224,0.15) 0px, transparent 1px, transparent 44px, rgba(0,255,224,0.15) 44px),
            repeating-linear-gradient(90deg, rgba(0,255,224,0.15) 0px, transparent 1px, transparent 44px, rgba(0,255,224,0.15) 44px)
          `,
          backgroundSize: '44px 44px'
        }}>
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-xl px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 text-sm font-mono">
            44×44px Grid (Min Touch Target)
          </div>
        </div>
      )}

      {showSafeAreas && (metrics.safeAreaTop > 0 || metrics.safeAreaBottom > 0 || metrics.safeAreaLeft > 0 || metrics.safeAreaRight > 0) && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {metrics.safeAreaTop > 0 && (
            <div
              className="absolute top-0 left-0 right-0 bg-red-500/20 border-b-2 border-red-500/50 flex items-center justify-center text-red-400 text-xs font-mono"
              style={{ height: `${metrics.safeAreaTop}px` }}
            >
              Safe Area Top: {metrics.safeAreaTop}px
            </div>
          )}
          {metrics.safeAreaBottom > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-red-500/20 border-t-2 border-red-500/50 flex items-center justify-center text-red-400 text-xs font-mono"
              style={{ height: `${metrics.safeAreaBottom}px` }}
            >
              Safe Area Bottom: {metrics.safeAreaBottom}px
            </div>
          )}
          {metrics.safeAreaLeft > 0 && (
            <div
              className="absolute top-0 bottom-0 left-0 bg-red-500/20 border-r-2 border-red-500/50 flex items-center justify-center text-red-400 text-xs font-mono writing-mode-vertical"
              style={{ width: `${metrics.safeAreaLeft}px` }}
            >
              Safe Left: {metrics.safeAreaLeft}px
            </div>
          )}
          {metrics.safeAreaRight > 0 && (
            <div
              className="absolute top-0 bottom-0 right-0 bg-red-500/20 border-l-2 border-red-500/50 flex items-center justify-center text-red-400 text-xs font-mono writing-mode-vertical"
              style={{ width: `${metrics.safeAreaRight}px` }}
            >
              Safe Right: {metrics.safeAreaRight}px
            </div>
          )}
        </div>
      )}

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 safe-bottom">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Device Diagnostics</h1>
              <p className="text-slate-400 text-sm">Live device metrics & mobile testing</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${
                showGrid
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Grid className="w-4 h-4" />
              {showGrid ? 'Hide' : 'Show'} Tap Grid
            </button>
            <button
              onClick={() => setShowSafeAreas(!showSafeAreas)}
              className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${
                showSafeAreas
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Eye className="w-4 h-4" />
              {showSafeAreas ? 'Hide' : 'Show'} Safe Areas
            </button>
            <button
              onClick={updateMetrics}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 transition-all flex items-center gap-2 text-sm font-medium"
            >
              Refresh Metrics
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              Device Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Mobile Device</span>
                <div className="flex items-center gap-2">
                  {checkStatus(isMobile)}
                  <span className="text-white font-mono text-sm">{isMobile ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Notched Display</span>
                <div className="flex items-center gap-2">
                  {checkStatus(isNotched)}
                  <span className="text-white font-mono text-sm">{isNotched ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">High DPI</span>
                <div className="flex items-center gap-2">
                  {checkStatus(isHighDPI)}
                  <span className="text-white font-mono text-sm">{metrics.dpr}x</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Zoom Level</span>
                <div className="flex items-center gap-2">
                  {checkStatus(!isZoomed)}
                  <span className={`font-mono text-sm ${isZoomed ? 'text-yellow-400' : 'text-white'}`}>
                    {metrics.zoomLevel}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Touch Points</span>
                <span className="text-white font-mono text-sm">{metrics.touchPoints}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-teal-400" />
              Viewport Dimensions
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Screen Size</span>
                <span className="text-white font-mono text-sm">{metrics.screenWidth} × {metrics.screenHeight}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Window Size</span>
                <span className="text-white font-mono text-sm">{metrics.innerWidth} × {metrics.innerHeight}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Visual Viewport</span>
                <span className="text-white font-mono text-sm">{Math.round(metrics.visualWidth)} × {Math.round(metrics.visualHeight)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Orientation</span>
                <span className="text-white font-mono text-sm capitalize">{metrics.orientation.split('-')[0]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Platform</span>
                <span className="text-white font-mono text-sm text-right truncate max-w-[200px]">{metrics.platform}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-purple-400" />
            Canvas Rendering Test
          </h3>
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full rounded-lg border border-slate-700/50"
            style={{ maxHeight: '200px' }}
          />
          <p className="text-slate-400 text-sm mt-3">
            Canvas scaled for {metrics.dpr}x DPI. Lines should appear crisp without blurring.
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Text Wrap & Overflow Test</h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-white text-sm">
                ThisIsAVeryLongWordWithoutSpacesThatShouldWrapProperly_AndNotCauseHorizontalScrolling_EvenOnSmallScreens
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-white text-sm">
                Normal text with spaces should wrap naturally without any issues. This is a longer sentence to test wrapping behavior on mobile devices at various zoom levels and screen sizes.
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg flex gap-2">
              <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm min-h-[44px]">Button 1</button>
              <button className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm min-h-[44px]">Button 2</button>
              <button className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm min-h-[44px]">Button 3</button>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-3">
            All text should wrap without overlapping. Buttons should remain on same line or wrap cleanly.
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Agent</h3>
          <code className="text-xs text-slate-400 break-all">{metrics.userAgent}</code>
        </div>
      </div>
    </div>
  );
}

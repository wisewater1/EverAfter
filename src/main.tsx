import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Deployment sync trigger - Debugging blank screen

console.log('EVERAFTER: main.tsx initializing... Build Time: ' + new Date().toISOString());

window.onerror = (message, source, lineno, colno, error) => {
  const msg = `CRITICAL RUNTIME ERROR: ${message} at ${source}:${lineno}:${colno}`;
  console.error(msg, error);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);color:#ff5555;padding:20px;z-index:99999;font-family:monospace;white-space:pre-wrap;overflow:auto;';
  overlay.innerHTML = `<h1>EverAfter Crash Detected</h1><p>${msg}</p><pre>${error?.stack || 'No stack trace available'}</pre><button onclick="window.location.reload()" style="background:#555;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">Reload Page</button>`;
  document.body.appendChild(overlay);
};

if (window.visualViewport) {
  const applyVVH = () => {
    if (window.visualViewport) {
      document.documentElement.style.setProperty('--vvh', `${window.visualViewport.height}px`);
    }
  };
  window.visualViewport.addEventListener('resize', applyVVH);
  window.visualViewport.addEventListener('scroll', applyVVH);
  applyVVH();
}

document.addEventListener('pointermove', (e) => {
  document.querySelectorAll('.btn-reactive').forEach((btn) => {
    const r = btn.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    (btn as HTMLElement).style.setProperty('--mx', `${x}%`);
    (btn as HTMLElement).style.setProperty('--my', `${y}%`);
  });
});

console.log('EVERAFTER: Attempting to render root...');
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element #root not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('EVERAFTER: Render command issued.');
} catch (e) {
  console.error('EVERAFTER: Render failed:', e);
  throw e;
}

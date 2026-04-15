import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installChunkLoadRecovery } from './lib/lazyWithRetry';

installChunkLoadRecovery();

// Visual viewport height CSS variable for mobile keyboard handling
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

// Edge-reactive button hover tracking
document.addEventListener('pointermove', (e) => {
  document.querySelectorAll('.btn-reactive').forEach((btn) => {
    const r = btn.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    (btn as HTMLElement).style.setProperty('--mx', `${x}%`);
    (btn as HTMLElement).style.setProperty('--my', `${y}%`);
  });
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

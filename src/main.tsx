import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (window.visualViewport) {
  const applyVVH = () => {
    document.documentElement.style.setProperty('--vvh', `${visualViewport.height}px`);
  };
  visualViewport.addEventListener('resize', applyVVH);
  visualViewport.addEventListener('scroll', applyVVH);
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

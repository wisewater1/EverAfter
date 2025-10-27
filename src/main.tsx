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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

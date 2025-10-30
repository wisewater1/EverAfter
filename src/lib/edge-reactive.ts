export function attachEdgeReactive(selector = '.ea-panel') {
  const panels = document.querySelectorAll<HTMLElement>(selector);

  const update = (el: HTMLElement, x: number, y: number) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((x - r.left) / r.width) * 100 + '%');
    el.style.setProperty('--my', ((y - r.top) / r.height) * 100 + '%');
  };

  const handlePointerMove = (e: PointerEvent) => {
    panels.forEach(p => update(p, e.clientX, e.clientY));
  };

  const handlePointerDown = (e: PointerEvent) => {
    panels.forEach(p => update(p, e.clientX, e.clientY));
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerdown', handlePointerDown);

  return () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerdown', handlePointerDown);
  };
}

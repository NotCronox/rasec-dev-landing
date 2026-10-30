/*
  Rasec Dev · calidad adaptable y animación solo cuando se ve.
  - tier: 'high' | 'low' | 'static' (también en <html data-tier>).
  - watch(el, cb): avisa cuando el elemento entra o sale de pantalla.
  - loop(fn): bucle con requestAnimationFrame que no corre con la pestaña oculta.
*/
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;

  let tier = 'high';
  if (reduce || cores < 4 || mem < 4) tier = 'static';
  else if (!fine && cores < 6) tier = 'low';
  root.dataset.tier = tier;

  const watch = (el, cb) => {
    if (!el) return;
    new IntersectionObserver(entries => cb(entries[entries.length - 1].isIntersecting), { threshold: 0 }).observe(el);
  };

  const loop = fn => {
    let id = 0, last = 0, on = false;
    const frame = t => {
      id = 0;
      if (!on) return;
      const dt = Math.min(50, last ? t - last : 16);
      last = t;
      fn(t, dt);
      if (on && !document.hidden) id = requestAnimationFrame(frame);
    };
    const start = () => { if (on) return; on = true; last = 0; id = requestAnimationFrame(frame); };
    const stop = () => { on = false; if (id) cancelAnimationFrame(id); id = 0; };
    document.addEventListener('visibilitychange', () => {
      if (on && !document.hidden && !id) { last = 0; id = requestAnimationFrame(frame); }
    });
    return { start, stop };
  };

  window.RasecFX = { tier, reduce, watch, loop };

  // Las animaciones infinitas de tarjetas, CTA y cinta solo corren mientras se ven (regla .fx-live en styles.css).
  root.classList.add('fx-live');
  document.querySelectorAll('.proj, .cta, .stack, .zv-dl').forEach(el => watch(el, on => el.classList.toggle('live', on)));
})();

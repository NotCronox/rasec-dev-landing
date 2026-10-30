/*
  Rasec Dev · landing
  - Estado compartido con la escena 3D: window.Rasec.persona (null | 'brasa' | 'barber' | 'vitrina' | 'zavitar').
  - La personalidad la fija, en orden de prioridad: la fila del índice bajo el cursor o con foco, y la sección de proyecto en el centro de la pantalla.
  - Entradas escalonadas, barra translúcida y línea del proceso.
*/
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Estado compartido ---------- */
  const listeners = [];
  const Rasec = window.Rasec = {
    persona: null,
    on(fn) { listeners.push(fn); fn(Rasec.persona); },
    film(id) { filmed = id; apply(); }
  };
  let hovered = null;   // fila del índice con cursor o foco
  let centered = null;  // proyecto en el centro de la pantalla
  let filmed = null;    // proyecto que muestra la película del inicio
  const apply = () => {
    const next = hovered || centered || filmed;
    if (next === Rasec.persona) return;
    Rasec.persona = next;
    if (next) root.dataset.persona = next; else delete root.dataset.persona;
    $$('.ix').forEach(a => a.classList.toggle('is-on', a.dataset.persona === next));
    listeners.forEach(fn => fn(next));
  };

  /* ---------- Índice: cursor, foco y toque ---------- */
  $$('.ix').forEach(a => {
    const id = a.dataset.persona;
    a.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = id; apply(); } });
    // Solo el foco de teclado activa la personalidad; un toque o un clic no la deja pegada.
    a.addEventListener('focus', () => { if (a.matches(':focus-visible')) { hovered = id; apply(); } });
    a.addEventListener('blur', () => { if (hovered === id) { hovered = null; apply(); } });
    a.addEventListener('click', () => { hovered = null; apply(); });
  });
  const list = $('.index-list');
  list.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovered = null; apply(); } });

  /* ---------- Proyecto en el centro de la pantalla ---------- */
  const projects = $$('.project');
  const centerIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const id = en.target.dataset.persona;
      if (en.isIntersecting) centered = id;
      else if (centered === id) centered = null;
    });
    apply();
  }, { rootMargin: '-45% 0px -45% 0px' });
  projects.forEach(p => centerIO.observe(p));

  /* ---------- Entradas ---------- */
  root.classList.add('rv-on');
  $$('main > section').forEach(sec => {
    $$('.rv', sec).forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 8) * 0.07}s`));
  });
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      revealIO.unobserve(en.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => revealIO.observe(el));
  const collageIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      collageIO.unobserve(en.target);
    });
  }, { threshold: 0.25 });
  $$('.project-body').forEach(p => collageIO.observe(p));

  /* ---------- Cristales detrás de cada proyecto: video en bucle que solo corre en pantalla ---------- */
  const crystals = $$('.project-crystal');
  const crystalIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const v = en.target.querySelector('video');
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        const p = v.play(); if (p && p.catch) p.catch(() => {});
      } else v.pause();
    });
  }, { rootMargin: '10% 0px' });
  if (!reduce) crystals.forEach(c => crystalIO.observe(c));
  // Lo que ya está en pantalla al cargar entra de inmediato (sin esperar al observador).
  requestAnimationFrame(() => $$('.film .rv').forEach(el => el.classList.add('in')));

  /* ---------- Barra superior y línea del proceso ---------- */
  const nav = $('#nav'), steps = $('#steps');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    nav.classList.toggle('scrolled', scrollY > 8);
    const r = steps.getBoundingClientRect();
    const p = reduce ? 1 : Math.max(0, Math.min(1, (innerHeight * 0.7 - r.top) / (r.height + innerHeight * 0.2)));
    steps.style.setProperty('--fill', p.toFixed(3));
    // Avance de cada cristal por la pantalla (-1 abajo, 0 centro, 1 arriba): sube entre niebla como en Igloo
    if (!reduce) crystals.forEach(c => {
      const b = c.getBoundingClientRect();
      if (b.bottom < -400 || b.top > innerHeight + 400) return;
      c.style.setProperty('--q', Math.max(-1.2, Math.min(1.2, (innerHeight / 2 - (b.top + b.height / 2)) / innerHeight)).toFixed(3));
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Si el 3D no arranca en 4 s, mostrar las imágenes de respaldo ---------- */
  setTimeout(() => { if (!root.classList.contains('has3d')) root.classList.add('no3d'); }, 4000);
})();

// Menú de teléfonos: abre una hoja con todas las secciones; se cierra al elegir una, con Escape o al girar a pantalla ancha
(() => {
  const btn = document.querySelector('.nav-menu'), sheet = document.getElementById('menu');
  if (!btn || !sheet) return;
  const root = document.documentElement;
  const set = open => {
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Cerrar el menú' : 'Abrir el menú');
    if (open) { sheet.hidden = false; requestAnimationFrame(() => root.classList.add('menu-open')); sheet.querySelector('a').focus({ preventScroll: true }); }
    else { root.classList.remove('menu-open'); setTimeout(() => { if (!root.classList.contains('menu-open')) sheet.hidden = true; }, 300); }
  };
  btn.addEventListener('click', () => set(!root.classList.contains('menu-open')));
  sheet.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { set(false); btn.focus(); } });
  matchMedia('(min-width: 721px)').addEventListener('change', e => { if (e.matches) set(false); });
})();

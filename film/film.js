/*
  Rasec Dev · la película del inicio (como en apple.com: no hay 3D corriendo, son cuadros renderizados).
  Un solo ScrollTrigger con scrub ata una línea de tiempo de GSAP al scroll de la sección .film:
    1. Cuadros de Blender en un lienzo: aparición, grabado de la tapa, giro y entrada en la pantalla.
    2. La captura real de Brasa Marina toma el lugar del vidrio (mismas esquinas, perspectiva exacta)
       y crece hasta la caja del video: entramos en la web y empieza su video de venta.
    3. Barber, Vitrina y Zavitar llegan con un travelling de cámara en 3D. Cada uno trae su video (Remotion y HyperFrames,
       en video-landing), que se reproduce solo mientras el proyecto está en escena. En teléfonos, la grabación del teléfono.
    4. Zavitar vuelve a la pantalla del portátil, la cámara sale, baja y la escena se apaga en el negro
       donde empieza el índice de proyectos.
  La película avanza y retrocede con el scroll; los videos corren solos (y se piden solo cuando se acercan).
  Con movimiento reducido queda una imagen fija.
*/
import { SEQUENCES, UNIT, INSIDE, T } from './config.js';
import { FrameSequence, FrameCanvas } from './frames.js';
import { quadMatrix, mixQuad } from './quad.js';

const root = document.documentElement;
const film = document.querySelector('.film');
const { gsap, ScrollTrigger } = window;

if (film && gsap && ScrollTrigger) start();
else if (film) root.classList.add('film-static');

function start() {
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  // matchMedia solo llama cuando alguna condición se cumple: por eso también va «reduce»
  mm.add({
    motion: '(prefers-reduced-motion: no-preference)',
    reduce: '(prefers-reduced-motion: reduce)',
    tall: '(orientation: portrait) and (max-width: 820px)',
  }, ctx => {
    const { motion, tall } = ctx.conditions;
    if (!motion) { root.classList.add('film-static'); return () => root.classList.remove('film-static'); }
    return build(tall ? 'tall' : 'wide');
  });
}

// Pide un video de los proyectos (H.264): empieza a bajar antes de que haga falta para que arranque sin espera
function loadVideo(v) {
  v.src = `${v.dataset.src}.mp4`;
  v.preload = 'auto';
  v.load();
}

function build(mode) {
  const seqConf = SEQUENCES[mode] || SEQUENCES.wide;
  const tall = mode === 'tall';
  const stage = film.querySelector('.film-stage');
  const canvas = film.querySelector('.film-canvas');
  const copy = film.querySelector('.film-copy');
  const line = film.querySelector('.film-line');
  const hint = film.querySelector('.film-hint');
  const screenEl = film.querySelector('.film-screen');
  const panels = [...film.querySelectorAll('.film-panel')];
  const panel = id => panels.find(p => p.dataset.persona === id);
  const zav = panel('zavitar');
  const out = zav.querySelector('.fp-out');
  const boxes = panels.map(p => p.querySelector('.fp-out')).filter(b => b && b !== out);

  root.classList.add('film-on');
  film.style.setProperty('--film-len', `${T.end * UNIT[mode]}svh`);

  const seq = new FrameSequence({ dir: seqConf.dir, count: seqConf.count, keep: tall ? 28 : 60, concurrency: tall ? 3 : 6 });
  const view = new FrameCanvas(canvas, stage, tall ? { dprCap: 1.5, blend: false } : {});
  let corners = null; // esquinas de la pantalla por cuadro, exportadas desde Blender
  fetch(seqConf.screen).then(r => r.json()).then(j => { corners = j; render(); }).catch(() => {});

  // Estado que la línea de tiempo mueve (GSAP interpola estos números; render() los dibuja)
  // enter: la captura de Brasa, del vidrio (0) a pantalla completa (1); out: Zavitar, de pantalla completa (1) al vidrio (0)
  const S = { frame: 0, enter: 0, out: 1 };
  const last = seqConf.count - 1;

  const screenQuad = f => {
    if (!corners) return null;
    const end = Math.min(last, corners.length - 1);
    const i = Math.min(end, Math.floor(f));
    const a = corners[i], b = corners[Math.min(end, i + 1)] || a;
    if (!a) return null;
    const k = Math.min(1, f - i);
    return a.map((p, n) => [p[0] + (b[n][0] - p[0]) * k, p[1] + (b[n][1] - p[1]) * k]);
  };

  // Dibuja el cuadro actual y coloca las pantallas HTML sobre el vidrio
  let rect = null;
  function render() {
    seq.want(S.frame);
    rect = view.draw(seq, S.frame, seqConf.size) || rect;
    if (!rect) return;
    const q = screenQuad(S.frame);
    if (!q) return;
    const onStage = q.map(([x, y]) => [rect.x + x * rect.w, rect.y + y * rect.h]);
    const target = fitQuad();
    screenEl.style.transform = quadMatrix(1440, 900, S.enter > 0 ? mixQuad(onStage, target, S.enter) : onStage);
    out.style.transform = quadMatrix(1440, 900, S.out < 1 ? mixQuad(onStage, target, S.out) : target);
    const still = quadMatrix(1440, 900, target);
    boxes.forEach(b => { b.style.transform = still; });
  }

  // Las pantallas 16:10 caben enteras en el espacio bajo el menú (en teléfonos, a lo ancho): nada queda cortado ni tapado
  function fitQuad() {
    const nav = parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 64;
    const pad = Math.max(12, view.w * 0.012), top = nav + pad;
    const aw = view.w - pad * 2, ah = view.h - top - pad;
    const s = Math.min(aw / 1440, ah / 900), w = 1440 * s, h = 900 * s;
    const x = (view.w - w) / 2, y = top + (ah - h) / 2;
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }
  seq.onload = () => render();
  seq.want(0);

  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  const span = ([a, b]) => b - a;
  // Momento de la línea de tiempo en que se ve el cuadro k de la salida
  const exitAt = k => T.exitFrames[0] + (k - INSIDE) / (last - INSIDE) * span(T.exitFrames);

  // 1. Cuadros de la entrada
  tl.to(S, { frame: INSIDE - 2, duration: span(T.frames), onUpdate: render }, T.frames[0]); // en INSIDE la pantalla renderizada ya pasa a Zavitar
  tl.to(copy, { autoAlpha: 0, y: -60, duration: span(T.copyOut) }, T.copyOut[0]);
  tl.to(hint, { autoAlpha: 0, duration: 0.3 }, 0);
  tl.fromTo(line, { autoAlpha: 0, y: 24, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out' }, T.line[0]);
  tl.to(line, { autoAlpha: 0, y: -24, filter: 'blur(8px)', duration: 0.5, ease: 'power2.in' }, T.line[1] - 0.5);

  // 2. La captura real toma el vidrio y crece hasta llenar el escenario
  tl.fromTo(screenEl, { opacity: 0 }, { opacity: 1, duration: span(T.screenIn) }, T.screenIn[0]);
  tl.to(S, { enter: 1, duration: span(T.enter), ease: 'power2.inOut', onUpdate: render }, T.enter[0]);
  tl.to(canvas, { opacity: 0, duration: 0.6 }, T.enter[0] + 0.4);
  tl.fromTo(screenEl, { borderRadius: 6 }, { borderRadius: 14, duration: span(T.enter) }, T.enter[0]);
  const brasaVideo = panel('brasa').querySelector(tall ? '.fp-tall' : '.fp-out');
  tl.fromTo(brasaVideo, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.inOut' }, T.enter[1]);

  // 3. Proyectos. Cada uno ocupa un tramo largo del scroll: su video avanza y retrocede con él.
  // Entre uno y otro, un travelling de cámara en 3D: la pantalla actual se va al fondo girando, desenfocada,
  // mientras la siguiente llega desde el otro lado y un barrido de luz cruza su vidrio.
  const glow = film.querySelector('.film-glow');
  tl.fromTo(glow, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, T.enter[0] + 0.4);
  tl.set(screenEl, { autoAlpha: 0 }, T.enter[1] + 0.4); // la caja de Brasa ya cubre la captura

  const soft = tall ? '' : 'blur(0px) ', away = tall ? 'brightness(.35)' : 'blur(10px) brightness(.35)'; // el desenfoque a pantalla completa pesa en teléfonos
  const travel = (prev, el, p) => {
    const d = p.dur, depth = () => -view.w * 0.42;
    tl.fromTo(prev, { xPercent: 0, rotationY: 0, z: 0, filter: `${soft}brightness(1)`, transformPerspective: 1400 },
      { xPercent: -58, rotationY: 46, z: depth, filter: away, duration: d, ease: 'power3.inOut' }, p.at);
    tl.set(el, { autoAlpha: 1 }, p.at);
    tl.fromTo(el, { xPercent: 62, rotationY: -46, z: depth, filter: away, transformPerspective: 1400 },
      { xPercent: 0, rotationY: 0, z: 0, filter: `${soft}brightness(1)`, duration: d, ease: 'power3.inOut' }, p.at + d * 0.08);
    tl.set(prev, { autoAlpha: 0 }, p.at + d);
    const gloss = el.querySelector('.fp-gloss');
    if (tall) return; // en teléfonos, sin el barrido de luz: una capa a pantalla completa menos
    tl.fromTo(gloss, { autoAlpha: 1, xPercent: -120 }, { xPercent: 120, duration: d * 0.8, ease: 'power2.inOut' }, p.at + d * 0.45);
    tl.set(gloss, { autoAlpha: 0 }, p.at + d * 1.3);
  };

  T.panels.forEach((p, n) => {
    const el = panel(p.id);
    const cap = el.querySelector('.fp-cap');
    if (n === 0) tl.set(el, { autoAlpha: 1 }, p.at);
    else travel(panel(T.panels[n - 1].id), el, p);
    tl.fromTo(cap, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, p.play[0]);
    tl.to(cap, { autoAlpha: 0, y: -20, duration: 0.35, ease: 'power2.in' }, p.play[1] - 0.2);
  });

  // 4. Salida: Zavitar vuelve al vidrio, reaparece la escena y la cámara sale, baja y se funde con el fondo de la página
  if (tall) tl.to(zav.querySelector('.fp-tall'), { autoAlpha: 0, duration: 0.45, ease: 'power1.inOut' }, T.exit[0]);
  tl.to(S, { out: 0, duration: span(T.exit), ease: 'power2.inOut', onUpdate: render }, T.exit[0]);
  tl.fromTo(out, { borderRadius: 14 }, { borderRadius: 6, duration: span(T.exit) }, T.exit[0]);
  tl.to(canvas, { opacity: 1, duration: 0.5 }, T.exit[0] + 0.2);
  tl.to(glow, { autoAlpha: 0, duration: 0.6 }, T.exit[0] + 0.2);
  tl.to(S, { frame: last, duration: span(T.exitFrames), onUpdate: render }, T.exitFrames[0]);
  tl.to(out, { opacity: 0, duration: exitAt(592) - exitAt(536), ease: 'power1.in' }, exitAt(536)); // con la pantalla renderizada
  // sin franja: la escena ya está a oscuras y el lienzo se desvanece hacia el fondo vivo de la página
  tl.to(canvas, { opacity: 0, duration: T.end - exitAt(560), ease: 'power1.in' }, exitAt(560));
  tl.set({}, {}, T.end);

  // Personalidad (colores del fondo y de los acentos) según lo que está en escena
  const dark = exitAt(540);
  const personaAt = t => {
    let id = null;
    for (const p of T.panels) if (t >= p.at + p.dur * 0.5) id = p.id;
    return t >= dark ? null : id;
  };
  let persona;
  const syncPersona = () => {
    const id = personaAt(tl.time());
    if (id !== persona) { persona = id; window.Rasec?.film?.(id); }
  };

  // Videos: se piden 4 unidades antes de su proyecto y se reproducen solos mientras el proyecto está en escena.
  // El scroll solo decide qué proyecto se ve; al volver a uno que ya terminó, su video empieza de nuevo.
  const media = [...film.querySelectorAll('.fp-video')]
    .filter(v => !v.dataset.mode || v.dataset.mode === mode)
    .map(v => {
      const i = T.panels.findIndex(q => q.id === v.closest('.film-panel').dataset.persona);
      const p = T.panels[i], next = T.panels[i + 1];
      const to = next ? next.at + next.dur * 0.5 : v.dataset.mode === 'tall' ? T.exit[0] + 0.3 : exitAt(592);
      return { v, i, a: p.play[0], from: p.play[0] - 0.3, to, asked: false, done: false, rewind: false };
    });
  const syncMedia = () => {
    const t = tl.time();
    for (const m of media) {
      if (!m.asked && t > m.a - 4) { m.asked = true; loadVideo(m.v); }
      const on = t >= m.from && t <= m.to;
      if (on) {
        // un video que terminó se queda en su último cuadro; solo empieza de nuevo si se sale del proyecto y se vuelve
        if (m.rewind) { m.rewind = false; m.v.currentTime = 0; }
        if (m.v.paused && !m.done) m.v.play().catch(() => {});
      } else {
        if (!m.v.paused) m.v.pause();
        if (m.done) { m.done = false; m.rewind = true; }
      }
    }
  };
  const pauseAll = () => media.forEach(m => m.v.pause());

  // «Saltar al índice» solo durante la entrada: después estorbaría a los pies de los proyectos
  const syncSkip = () => root.classList.toggle('film-skipping', tl.time() > 0.4 && tl.time() < T.panels[0].at);
  tl.eventCallback('onUpdate', () => { syncPersona(); syncMedia(); syncSkip(); }); // con el scrub, la línea de tiempo llega después que el scroll

  const panelImgs = film.querySelectorAll('.film-panel img');
  let warm = false;
  const st = ScrollTrigger.create({
    trigger: film,
    start: 'top top',
    end: 'bottom bottom',
    animation: tl,
    scrub: 0.35,
    invalidateOnRefresh: true,
    onUpdate: self => {
      root.classList.toggle('film-covering', self.isActive && self.progress < 0.97); // el fondo 3D no se ve: descansa
      if (self.progress > 0.002) seq.release();
      if (self.progress > 0.2 && !warm) { warm = true; panelImgs.forEach(im => { im.loading = 'eager'; }); } // las capturas, antes de que hagan falta
    },
    onLeave: () => { window.Rasec?.film?.(null); root.classList.remove('film-covering'); pauseAll(); },
    onLeaveBack: () => { root.classList.remove('film-covering'); pauseAll(); },
    onEnterBack: () => { syncPersona(); syncMedia(); },
    onRefresh: () => { view.resize(); render(); },
  });

  // El resto de la secuencia: al empezar a recorrerla (onUpdate) o con la página quieta un rato después de cargar
  const idle = window.requestIdleCallback || (fn => fn());
  const early = () => setTimeout(() => idle(() => seq.release()), 2500);
  if (document.readyState === 'complete') early(); else addEventListener('load', early, { once: true });

  // Al terminar el video de un proyecto, la página sigue sola hasta el siguiente; después de Zavitar, la cámara sale
  // del portátil y se llega al índice. Cualquier gesto de la persona (dedo, rueda, teclado) cancela el viaje.
  const scrollAt = t => st.start + (t / T.end) * (st.end - st.start);
  let auto = 0, lastInput = 0;
  const stopAuto = () => { if (auto) cancelAnimationFrame(auto); auto = 0; };
  const onInput = () => { lastInput = performance.now(); stopAuto(); };
  const inputs = ['wheel', 'touchstart', 'keydown', 'mousedown'];
  inputs.forEach(e => addEventListener(e, onInput, { passive: true }));
  const glide = (y1, ms) => {
    stopAuto();
    const y0 = scrollY, t0 = performance.now();
    const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      scrollTo(0, y0 + (y1 - y0) * ease(k));
      auto = k < 1 ? requestAnimationFrame(step) : 0;
    };
    auto = requestAnimationFrame(step);
  };
  const onEnded = m => () => {
    m.done = true;
    const t = tl.time();
    if (t < m.from || t > m.to || auto) return;          // ya no está en escena, o ya va de viaje
    if (performance.now() - lastInput < 700) return;      // la persona está haciendo scroll: manda ella
    const next = T.panels[m.i + 1];
    if (next) glide(scrollAt(next.play[0] + 0.1), tall ? 1900 : 2300);
    else { // la salida del portátil, sin prisa, hasta el índice de proyectos
      const index = document.getElementById('proyectos');
      glide(index ? index.getBoundingClientRect().top + scrollY : scrollAt(T.end), tall ? 4800 : 5800);
    }
  };
  const endedFns = media.map(m => { const fn = onEnded(m); m.v.addEventListener('ended', fn); return fn; });

  render();
  return () => { // limpieza al cambiar de modo (giro del teléfono, movimiento reducido)
    st.kill(); tl.kill(); seq.onload = null; pauseAll(); stopAuto();
    inputs.forEach(e => removeEventListener(e, onInput));
    media.forEach((m, n) => m.v.removeEventListener('ended', endedFns[n]));
    root.classList.remove('film-on', 'film-skipping', 'film-covering');
    gsap.set([copy, line, hint, screenEl, canvas, out, film.querySelector('.film-glow'), ...panels,
      ...film.querySelectorAll('.fp-cap, .fp-out, .fp-gloss, .fp-tall')], { clearProps: 'all' });
    screenEl.style.transform = out.style.transform = '';
    boxes.forEach(b => { b.style.transform = ''; });
    window.Rasec?.film?.(null);
  };
}

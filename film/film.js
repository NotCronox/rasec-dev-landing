/*
  Rasec Dev · la película del inicio (como en apple.com: no hay 3D corriendo, son cuadros renderizados).
  Un solo ScrollTrigger con scrub ata una línea de tiempo de GSAP al scroll de la sección .film:
    1. Cuadros de Blender en un lienzo: aparición, grabado de la tapa, giro y entrada en la pantalla.
    2. La captura real de Brasa Marina toma el lugar del vidrio (mismas esquinas, perspectiva exacta)
       y crece hasta llenar la pantalla: entramos en la web. Sube un teléfono con alguien haciendo un pedido.
    3. Barber (franjas de poste de barbería), Vitrina (puerta de vidrio) y Zavitar (rueda de formatos),
       cada uno con su grabación real en el teléfono o en la pantalla.
    4. Zavitar vuelve a la pantalla del portátil, la cámara sale, baja y la escena se apaga en el negro
       donde empieza el índice de proyectos.
  Todo lo que mueve el scroll avanza y retrocede con él. Los videos de los teléfonos corren solos mientras
  su panel está en escena (y se piden solo cuando se acercan). Con movimiento reducido queda una imagen fija.
*/
import { SEQUENCES, UNIT, INSIDE, T } from './config.js';
import { FrameSequence, FrameCanvas } from './frames.js';
import { quadMatrix, mixQuad, coverQuad } from './quad.js';

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

// Pide un video de los flujos: AV1 (liviano) y H.264 de respaldo
function loadVideo(v) {
  const base = v.dataset.src;
  v.innerHTML = `<source src="${base}.mp4" type='video/mp4; codecs="av01.0.08M.08"'><source src="${base}.h264.mp4" type="video/mp4">`;
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
  const ring = film.querySelector('.film-ring');
  const panels = [...film.querySelectorAll('.film-panel')];
  const panel = id => panels.find(p => p.dataset.persona === id);
  const zav = panel('zavitar');
  const out = zav.querySelector('.fp-out');

  root.classList.add('film-on');
  film.style.setProperty('--film-len', `${T.end * UNIT[mode]}svh`);

  const seq = new FrameSequence({ dir: seqConf.dir, count: seqConf.count, keep: tall ? 40 : 60 });
  const view = new FrameCanvas(canvas, stage);
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
    const target = coverQuad(1440, 900, view.w, view.h);
    screenEl.style.transform = quadMatrix(1440, 900, S.enter > 0 ? mixQuad(onStage, target, S.enter) : onStage);
    out.style.transform = quadMatrix(1440, 900, S.out < 1 ? mixQuad(onStage, target, S.out) : target);
  }
  seq.onload = () => render();
  seq.want(0);

  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  const span = ([a, b]) => b - a;
  // Momento de la línea de tiempo en que se ve el cuadro k de la salida
  const exitAt = k => T.exitFrames[0] + (k - INSIDE) / (last - INSIDE) * span(T.exitFrames);

  // 1. Cuadros de la entrada
  tl.to(S, { frame: INSIDE, duration: span(T.frames), onUpdate: render }, T.frames[0]);
  tl.to(copy, { autoAlpha: 0, y: -60, duration: span(T.copyOut) }, T.copyOut[0]);
  tl.to(hint, { autoAlpha: 0, duration: 0.3 }, 0);
  tl.fromTo(line, { autoAlpha: 0, y: 24, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out' }, T.line[0]);
  tl.to(line, { autoAlpha: 0, y: -24, filter: 'blur(8px)', duration: 0.5, ease: 'power2.in' }, T.line[1] - 0.5);

  // 2. La captura real toma el vidrio y crece hasta llenar el escenario
  tl.fromTo(screenEl, { opacity: 0 }, { opacity: 1, duration: span(T.screenIn) }, T.screenIn[0]);
  tl.to(S, { enter: 1, duration: span(T.enter), ease: 'power2.inOut', onUpdate: render }, T.enter[0]);
  tl.to(canvas, { opacity: 0, duration: 0.6 }, T.enter[0] + 0.4);
  tl.fromTo(screenEl, { borderRadius: 6 }, { borderRadius: 0, duration: span(T.enter) }, T.enter[0]);

  // 3. Proyectos
  const ringSize = () => Math.min(view.h * 0.7, view.w * (tall ? 0.86 : 0.6));
  const hole = () => ringSize() * 0.19;               // el centro de la rueda (radio 40 de 200 en el SVG)
  const full = () => Math.hypot(view.w, view.h) / 2 + 8; // un círculo que cubre todo el escenario
  const circle = r => () => `circle(${r()}px at 50% 50%)`;

  const REVEAL = {
    // Franjas diagonales que se ensanchan mientras se deslizan, con un filo dorado: el poste de la barbería
    pole(el, p) {
      tl.fromTo(el, { '--bar': '0vmax', '--pole': '0vmax' },
        { '--bar': '14.4vmax', '--pole': '-22vmax', duration: p.dur, ease: 'power2.inOut' }, p.at);
      tl.fromTo(el, { '--edge': 0 }, { '--edge': 1, duration: p.dur * 0.3, ease: 'power1.out' }, p.at);
      tl.to(el, { '--edge': 0, duration: p.dur * 0.3, ease: 'power1.in' }, p.at + p.dur * 0.7);
    },
    // Una puerta de vidrio que gira sobre su bisagra hasta cerrarse frente a ti; un reflejo cruza el vidrio
    door(el, p) {
      tl.fromTo(el, { rotationY: -86, transformOrigin: '0% 50%', transformPerspective: 1700, filter: 'brightness(1.5)' },
        { rotationY: 0, filter: 'brightness(1)', duration: p.dur, ease: 'power3.inOut' }, p.at);
      const gloss = el.querySelector('.fp-gloss');
      tl.fromTo(gloss, { autoAlpha: 1, xPercent: -110 }, { xPercent: 110, duration: p.dur * 0.9, ease: 'power2.inOut' }, p.at + p.dur * 0.35);
      tl.set(gloss, { autoAlpha: 0 }, p.at + p.dur * 1.25);
    },
    // La web anterior cae al centro de la rueda de formatos, la rueda elige JPG y Zavitar se abre desde ahí
    wheel(el, p, prev) {
      const a = p.at;
      tl.fromTo(prev, { clipPath: circle(full) }, { clipPath: circle(hole), duration: 0.7, ease: 'power3.inOut' }, a);
      tl.fromTo(ring, { autoAlpha: 0, scale: 1.6, rotation: -75 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.75, ease: 'power3.out' }, a + 0.1);
      tl.fromTo(ring.querySelector('.on'), { '--on': 0 }, { '--on': 1, duration: 0.15 }, a + 0.78);
      tl.set(el, { autoAlpha: 1 }, a + 0.9);
      tl.fromTo(el, { clipPath: circle(hole) }, { clipPath: circle(full), duration: 0.7, ease: 'power3.inOut' }, a + 0.9);
      tl.to(ring, { scale: 2.8, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, a + 0.95);
    },
  };

  T.panels.forEach((p, n) => {
    const el = panel(p.id);
    const cap = el.querySelector('.fp-cap');
    const phone = el.querySelector('.fp-phone');
    const prev = n === 0 ? null : n === 1 ? screenEl : panel(T.panels[n - 1].id);
    if (p.reveal !== 'wheel') tl.set(el, { autoAlpha: 1 }, p.at);
    REVEAL[p.reveal]?.(el, p, prev);
    if (prev) {
      // el anterior se aparta (en Zavitar no: se queda nítido dentro de la rueda)
      // fromTo desde su brillo actual: desde «none» GSAP interpolaría desde brillo 0 (un apagón)
      if (p.reveal !== 'wheel') {
        tl.fromTo(prev, { filter: 'brightness(1)', scale: 1 },
          { filter: 'brightness(.4)', scale: 0.94, duration: p.dur, ease: 'power2.inOut' }, p.at);
      }
      tl.set(prev, { autoAlpha: 0 }, p.at + p.dur);
      if (n === 1) tl.set(panel(T.panels[0].id), { autoAlpha: 0 }, p.at + p.dur);
    }
    if (phone) {
      // la web de escritorio queda atrás, un poco más oscura, y sube el teléfono con la grabación
      // (el oscurecido va en la imagen: el contenedor se oscurece aparte cuando entra el proyecto siguiente)
      const back = n === 0 ? screenEl.querySelector('img') : el.querySelector('.fp-img');
      const at = p.at + p.dur * T.phoneIn;
      tl.fromTo(phone, { autoAlpha: 0, y: () => view.h * 0.18, rotation: tall ? 0 : 4 },
        { autoAlpha: 1, y: 0, rotation: 0, duration: 0.8, ease: 'power3.out' }, at);
      if (back) tl.fromTo(back, { '--dim': 1 }, { '--dim': tall ? 0.42 : 0.66, duration: 0.8, ease: 'power2.out' }, at);
    }
    const capAt = p.reveal === 'wheel' ? p.at + 1.2 : p.at + p.dur * 0.6;
    tl.fromTo(cap, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, capAt);
    const next = T.panels[n + 1];
    tl.to(cap, { autoAlpha: 0, y: -20, duration: 0.35, ease: 'power2.in' }, next ? next.at - 0.1 : T.exit[0] - 0.2);
  });

  // 4. Salida: Zavitar vuelve al vidrio, reaparece la escena y la cámara sale, baja y se apaga
  if (tall) tl.to(zav.querySelector('.fp-tall'), { autoAlpha: 0, duration: 0.45, ease: 'power1.inOut' }, T.exit[0]);
  tl.to(S, { out: 0, duration: span(T.exit), ease: 'power2.inOut', onUpdate: render }, T.exit[0]);
  tl.fromTo(out, { borderRadius: 0 }, { borderRadius: 6, duration: span(T.exit) }, T.exit[0]);
  tl.to(canvas, { opacity: 1, duration: 0.5 }, T.exit[0] + 0.2);
  tl.to(S, { frame: last, duration: span(T.exitFrames), onUpdate: render }, T.exitFrames[0]);
  tl.to(out, { opacity: 0, duration: exitAt(592) - exitAt(536), ease: 'power1.in' }, exitAt(536)); // con la pantalla renderizada
  tl.set({}, {}, T.end);

  // Personalidad (colores del fondo y de los acentos) según lo que está en escena
  const dark = exitAt(540);
  const personaAt = t => {
    let id = null;
    for (const p of T.panels) if (t >= p.at + p.dur * 0.4) id = p.id;
    return t >= dark ? null : id;
  };
  let persona;
  const syncPersona = () => {
    const id = personaAt(tl.time());
    if (id !== persona) { persona = id; window.Rasec?.film?.(id); }
  };

  // Videos: se piden 3 unidades antes de su panel y corren mientras el panel está en escena
  const media = [...film.querySelectorAll('.fp-video')]
    .filter(v => !v.dataset.mode || v.dataset.mode === mode)
    .map(v => {
      const i = T.panels.findIndex(p => p.id === v.closest('.film-panel').dataset.persona);
      const p = T.panels[i], next = T.panels[i + 1];
      const from = p.reveal === 'wheel' ? p.at + 0.9 : p.at;
      const to = next ? next.at + next.dur : v.dataset.mode === 'tall' ? T.exit[0] + 0.5 : exitAt(592);
      return { v, from, to, asked: false, fresh: true };
    });
  const syncMedia = () => {
    const t = tl.time();
    for (const m of media) {
      if (!m.asked && t > m.from - 3) { m.asked = true; loadVideo(m.v); }
      const on = t >= m.from && t <= m.to;
      if (on && m.v.paused) {
        if (m.fresh) { m.fresh = false; m.v.currentTime = 0; }
        m.v.play().catch(() => {});
      } else if (!on && !m.v.paused) m.v.pause();
    }
  };
  const pauseAll = () => media.forEach(m => m.v.pause());

  tl.eventCallback('onUpdate', () => { syncPersona(); syncMedia(); }); // con el scrub, la línea de tiempo llega después que el scroll

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
      if (self.progress > 0.002) seq.release();
      if (self.progress > 0.2 && !warm) { warm = true; panelImgs.forEach(im => { im.loading = 'eager'; }); } // las capturas, antes de que hagan falta
    },
    onLeave: () => { window.Rasec?.film?.(null); pauseAll(); },
    onLeaveBack: pauseAll,
    onEnterBack: () => { syncPersona(); syncMedia(); },
    onRefresh: () => { view.resize(); render(); },
  });

  // El resto de la secuencia: al empezar a recorrerla (onUpdate) o con la página quieta un rato después de cargar
  const idle = window.requestIdleCallback || (fn => fn());
  const early = () => setTimeout(() => idle(() => seq.release()), 2500);
  if (document.readyState === 'complete') early(); else addEventListener('load', early, { once: true });

  render();
  return () => { // limpieza al cambiar de modo (giro del teléfono, movimiento reducido)
    st.kill(); tl.kill(); seq.onload = null; pauseAll();
    root.classList.remove('film-on');
    gsap.set([copy, line, hint, screenEl, canvas, ring, out, ...panels,
      ...film.querySelectorAll('.fp-cap, .fp-phone, .fp-img, .fp-gloss, .fp-tall, .film-screen img, .film-ring .on')], { clearProps: 'all' });
    screenEl.style.transform = out.style.transform = '';
    window.Rasec?.film?.(null);
  };
}

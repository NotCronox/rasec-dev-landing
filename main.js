(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  $('#year').textContent = new Date().getFullYear();
  if ('scrollRestoration' in history && !location.hash) { history.scrollRestoration = 'manual'; scrollTo(0, 0); }

  /* ---------- Título: separar en palabras para la entrada ---------- */
  const title = $('#title');
  let delay = 0.12;
  const words = [];
  [...title.childNodes].forEach(n => {
    const isAccent = n.nodeType === 1 && n.classList.contains('accent');
    n.textContent.split(/\s+/).filter(Boolean).forEach(word => words.push({ word, isAccent }));
  });
  title.textContent = '';
  words.forEach(({ word, isAccent }, i) => {
    const w = document.createElement('span');
    w.className = isAccent ? 'w accent' : 'w';
    const inner = document.createElement('span');
    inner.textContent = word;
    inner.style.setProperty('--d', `${delay}s`);
    delay += 0.06;
    w.append(inner);
    title.append(w);
    if (i < words.length - 1) title.append(' ');
  });

  /* ---------- Arranque (espera las fuentes para evitar saltos) ---------- */
  let started = false;
  const start = () => { if (started) return; started = true; requestAnimationFrame(() => root.classList.add('ready')); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  setTimeout(start, 700);

  /* ---------- Rayos de luz sobre la cuadrícula ---------- */
  const beams = $('#beams');
  if (!reduce && beams) {
    const GRID = 64;
    const make = () => {
      beams.textContent = '';
      const cols = Math.floor(innerWidth / GRID), rows = Math.floor((innerHeight * 0.7) / GRID);
      const nV = innerWidth < 640 ? 3 : 6, nH = innerWidth < 640 ? 2 : 4;
      for (let i = 0; i < nV; i++) {
        const b = document.createElement('span');
        b.className = 'beam-v';
        b.style.left = `${(1 + Math.floor(Math.random() * Math.max(1, cols - 1))) * GRID}px`;
        b.style.setProperty('--t', `${6 + Math.random() * 6}s`);
        b.style.setProperty('--dl', `${-Math.random() * 10}s`);
        beams.append(b);
      }
      for (let i = 0; i < nH; i++) {
        const b = document.createElement('span');
        b.className = 'beam-h';
        b.style.top = `${(1 + Math.floor(Math.random() * Math.max(1, rows - 1))) * GRID}px`;
        b.style.setProperty('--t', `${8 + Math.random() * 6}s`);
        b.style.setProperty('--dl', `${-Math.random() * 12}s`);
        beams.append(b);
      }
    };
    make();
    let rt, lastW = innerWidth;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; make(); } }, 200);
    });
  }

  /* ---------- Aparición al hacer scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Scroll: progreso, header y línea del proceso ---------- */
  const prog = $('#progress'), top = $('#top'), steps = $('#steps'), stepEls = $$('.step');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    top.classList.toggle('scrolled', scrollY > 16);
    if (steps) {
      const r = steps.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (innerHeight * 0.75 - r.top) / r.height));
      steps.style.setProperty('--fill', p.toFixed(3));
      stepEls.forEach((s, i) => s.classList.toggle('lit', p >= i / stepEls.length + 0.02 || p === 1));
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Tarjetas: inclinación sutil y luz que sigue el cursor ---------- */
  $$('.proj').forEach(card => {
    let raf = 0;
    card.addEventListener('pointermove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        if (finePointer && !reduce) {
          card.classList.add('tilting');
          card.style.setProperty('--ry', `${(px - 0.5) * 4}deg`);
          card.style.setProperty('--rx', `${(0.5 - py) * 3}deg`);
        }
      });
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  /* ---------- Servicios: brillo bajo el cursor ---------- */
  $$('.svc').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ---------- Clic en un proyecto: transición y redirección ---------- */
  const wipe = $('#wipe'), wipeName = $('#wipeName');
  $$('.proj, .qk').forEach(card => {
    card.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const href = card.href;
      wipe.style.setProperty('--wc', card.style.getPropertyValue('--c') || '#5b7cff');
      wipeName.textContent = card.dataset.name;
      wipe.classList.add('on');
      setTimeout(() => { location.href = href; }, reduce ? 50 : 1050);
    });
  });
  // Al volver con "atrás", quitar la cortina
  addEventListener('pageshow', () => wipe.classList.remove('on'));

  /* ---------- Botones magnéticos y luz del cursor (escritorio) ---------- */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.25}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });

    const cursor = $('#cursor');
    let cx = innerWidth / 2, cy = innerHeight / 3, tx = cx, ty = cy;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cursor.classList.add('on'); }, { passive: true });
    const follow = () => {
      cx += (tx - cx) * 0.1; cy += (ty - cy) * 0.1;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(follow);
    };
    follow();
  }
})();

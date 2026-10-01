(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  $('#year').textContent = new Date().getFullYear();
  if ('scrollRestoration' in history && !location.hash) { history.scrollRestoration = 'manual'; scrollTo(0, 0); }

  /* ---------- Título: separar en palabras para la animación ---------- */
  let delay = 0.1;
  $$('#title .line').forEach(line => {
    const walk = (node, gradParent) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--d', `${delay}s`);
            if (gradParent) inner.className = 'grad';
            delay += 0.07;
            w.append(inner);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          const isGrad = n.classList.contains('grad');
          walk(n, isGrad);
          if (isGrad) n.replaceWith(...n.childNodes);
        }
      });
    };
    walk(line, false);
  });

  /* ---------- Loader ---------- */
  const loader = $('#loader');
  const startPage = () => {
    root.classList.add('ready');
    startCounters();
    startRotator();
  };
  let seen = false;
  try { seen = sessionStorage.getItem('rd-seen') === '1'; sessionStorage.setItem('rd-seen', '1'); } catch (e) {}

  if (reduce || seen) {
    loader.classList.add('gone');
    requestAnimationFrame(startPage);
  } else {
    const num = $('#loaderNum'), bar = $('.loader-bar i');
    const dur = 1300, t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(e * 100);
      bar.style.width = `${e * 100}%`;
      if (p < 1) requestAnimationFrame(tick);
      else {
        loader.classList.add('done');
        setTimeout(startPage, 250);
        setTimeout(() => loader.classList.add('gone'), 1000);
      }
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Palabra que rota con efecto "scramble" ---------- */
  function startRotator() {
    const el = $('#rot');
    const words = ['restaurantes', 'barberías', 'tiendas', 'emprendedores', 'tu negocio'];
    const chars = 'abcdefghijklmnopqrstuvwxyz#$%&*@';
    let i = 0;
    if (reduce) return;
    const scramble = to => {
      const from = el.textContent, len = Math.max(from.length, to.length);
      let frame = 0;
      const queue = Array.from({ length: len }, (_, k) => ({
        from: from[k] || '', to: to[k] || '',
        start: Math.floor(Math.random() * 12), end: Math.floor(Math.random() * 12) + 12 + k
      }));
      const step = () => {
        let out = '', done = 0;
        queue.forEach(q => {
          if (frame >= q.end) { done++; out += q.to; }
          else if (frame >= q.start) out += chars[Math.floor(Math.random() * chars.length)];
          else out += q.from;
        });
        el.textContent = out;
        if (done < queue.length) { frame++; requestAnimationFrame(step); }
      };
      step();
    };
    setInterval(() => { i = (i + 1) % words.length; scramble(words[i]); }, 2600);
  }

  /* ---------- Contadores ---------- */
  function startCounters() {
    $$('[data-count]').forEach((el, idx) => {
      const target = +el.dataset.count, suffix = el.dataset.suffix || '', pad = +el.dataset.pad || 0;
      const fmt = v => String(v).padStart(pad, '0') + suffix;
      if (reduce) { el.textContent = fmt(target); return; }
      const t0 = performance.now() + 1100 + idx * 150, dur = 1400;
      const tick = now => {
        const p = Math.max(0, Math.min(1, (now - t0) / dur));
        el.textContent = fmt(Math.round((1 - Math.pow(1 - p, 4)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Aparición al hacer scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Barra de progreso + header ---------- */
  const prog = $('#progress'), top = $('.top');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    top.classList.toggle('scrolled', scrollY > 20);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Tarjetas de proyecto: inclinación 3D ---------- */
  $$('.proj').forEach(card => {
    let raf = 0;
    const set = (x, y) => {
      const r = card.getBoundingClientRect();
      const px = (x - r.left) / r.width, py = (y - r.top) / r.height;
      card.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
      card.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    };
    if (finePointer && !reduce) {
      card.addEventListener('pointermove', e => {
        card.classList.add('tilting');
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => set(e.clientX, e.clientY));
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    }
  });

  /* En celular: leve inclinación ligada al scroll para dar vida */
  if (!finePointer && !reduce) {
    const cards = $$('.proj');
    const sway = () => {
      cards.forEach(c => {
        if (!c.classList.contains('in')) return;
        const r = c.getBoundingClientRect();
        const center = (r.top + r.height / 2) / innerHeight - 0.5;
        c.style.setProperty('--rx', `${(-center * 10).toFixed(2)}deg`);
      });
    };
    addEventListener('scroll', () => requestAnimationFrame(sway), { passive: true });
  }

  /* ---------- Clic en proyecto: transición y redirección ---------- */
  const wipe = $('#wipe'), wipeTxt = $('#wipeTxt');
  $$('.proj, .qk').forEach(card => {
    card.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const href = card.href;
      const color = getComputedStyle(card).getPropertyValue('--c1').trim();
      wipe.style.setProperty('--wc', color);
      wipe.style.setProperty('--wx', `${e.clientX || innerWidth / 2}px`);
      wipe.style.setProperty('--wy', `${e.clientY || innerHeight / 2}px`);
      wipeTxt.innerHTML = `<small>Abriendo</small>${card.dataset.name}`;
      wipe.classList.add('on');
      setTimeout(() => { location.href = href; }, reduce ? 50 : 900);
    });
  });
  // Al volver con el botón "atrás", quitar la cortina
  addEventListener('pageshow', () => wipe.classList.remove('on'));

  /* ---------- Servicios: brillo que sigue el dedo/cursor ---------- */
  $$('.svc').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ---------- Botones magnéticos (escritorio) ---------- */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Luz que sigue el cursor ---------- */
  const cursor = $('#cursor');
  let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
  const mouse = { x: -9999, y: -9999 };
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY; mouse.x = e.clientX; mouse.y = e.clientY;
    if (finePointer) cursor.classList.add('on');
  }, { passive: true });
  if (finePointer && !reduce) {
    const follow = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(follow);
    };
    follow();
  }

  /* ---------- Chispas al tocar ---------- */
  if (!reduce) {
    const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#ffffff'];
    addEventListener('pointerdown', e => {
      for (let k = 0; k < 10; k++) {
        const s = document.createElement('span');
        s.className = 'spark';
        s.style.left = `${e.clientX}px`; s.style.top = `${e.clientY}px`;
        s.style.background = colors[k % colors.length];
        document.body.append(s);
        const a = (Math.PI * 2 * k) / 10 + Math.random() * 0.5, d = 30 + Math.random() * 40;
        s.animate([
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0)`, opacity: 0 }
        ], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => s.remove();
      }
    }, { passive: true });
  }

  /* ---------- Fondo de partículas (constelación) ---------- */
  const cv = $('#bg');
  if (!reduce && cv.getContext) {
    const ctx = cv.getContext('2d');
    let w, h, dpr, pts = [];
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
      const n = Math.round(Math.min(90, (innerWidth * innerHeight) / 14000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35 * dpr, vy: (Math.random() - 0.5) * 0.35 * dpr,
        r: (Math.random() * 1.6 + 0.6) * dpr
      }));
    };
    resize();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    let running = true;
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(draw); });
    const link = 120;
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const L = link * dpr, mx = mouse.x * dpr, my = mouse.y * dpr;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const dxm = mx - p.x, dym = my - p.y, dm = Math.hypot(dxm, dym);
        if (dm < 180 * dpr) { p.x += dxm * 0.004; p.y += dym * 0.004; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(199,201,255,.75)'; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < L) {
            ctx.strokeStyle = `rgba(167,139,250,${(1 - d / L) * 0.35})`;
            ctx.lineWidth = dpr * 0.8;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        if (dm < 160 * dpr) {
          ctx.strokeStyle = `rgba(96,165,250,${(1 - dm / (160 * dpr)) * 0.6})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }
})();

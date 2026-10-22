/*
  Zavitar · página del programa
  - Lee release.json para el botón de descarga (instalador .exe), la versión, el tamaño, el
    SHA-256 y la versión portable (zip).
    NOTA: las URL de descarga (GitHub Releases v0.1.0) solo serán válidas cuando el release
    esté publicado. Mientras sha256 o size_mb valgan "PENDING" no se muestran (el bloque del
    hash del instalador queda oculto). Si release.json no carga, la página deja el texto
    estático y los enlaces a la página de versiones de GitHub.
  - Botones "Copiar", visor de capturas, aparición al hacer scroll, cabecera y rayos del fondo.
*/
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Arranque ---------- */
  let started = false;
  const start = () => { if (started) return; started = true; requestAnimationFrame(() => root.classList.add('ready')); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  setTimeout(start, 700);

  /* ---------- Datos de la versión ---------- */
  const fmtSize = mb => `${Math.round(Number(mb))} MB`;
  const fmtDate = iso => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  };
  const isHttps = u => typeof u === 'string' && /^https:\/\//.test(u);
  // Valores aún no disponibles (p. ej. "PENDING") se tratan como ausentes.
  const validSha = s => typeof s === 'string' && /^[0-9a-f]{64}$/i.test(s);
  const validSize = n => typeof n === 'number' && isFinite(n) && n > 0;
  const fileOf = (rel, re) => {
    const f = rel.file || (isHttps(rel.url) ? rel.url.split('/').pop() : '');
    return re.test(f || '') ? f : '';
  };

  fetch('release.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(rel => {
      if (!rel || !rel.version) throw new Error('release.json incompleto');
      const size = validSize(rel.size_mb) ? fmtSize(rel.size_mb) : '';
      const file = fileOf(rel, /^[\w.-]+\.(exe|zip)$/i);

      // Instalador (descarga principal)
      const btn = $('#dlBtn');
      if (btn && isHttps(rel.url)) btn.href = rel.url;
      const label = $('#dlLabel');
      if (label) label.textContent = `Descargar Zavitar ${rel.version}${size ? ` (${size})` : ''}`;
      const date = $('#dlDate');
      if (date) date.textContent = `versión ${rel.version}${rel.date ? ` · ${fmtDate(rel.date)}` : ''}`;
      const dlFile = $('#dlFile');
      if (dlFile && file) dlFile.textContent = file;
      if (file) $$('[data-release="file"]').forEach(el => { el.textContent = file; });
      const hashSetup = $('#hashSetup'), shaSetup = $('#shaSetup');
      if (hashSetup && shaSetup) {
        if (validSha(rel.sha256)) { shaSetup.textContent = rel.sha256.toLowerCase(); hashSetup.hidden = false; }
        else hashSetup.hidden = true;
      }
      const cmd = $('#cmdHash');
      if (cmd && file) cmd.textContent = `Get-FileHash -Algorithm SHA256 .\\${file}`;
      const rp = $('#relPage');
      if (rp && isHttps(rel.releases_page)) rp.href = rel.releases_page;

      // Versión portable (zip)
      const p = rel.portable;
      if (p) {
        const zip = $('#zipLink'), zipLabel = $('#zipLabel'), shaZip = $('#shaZip');
        const zfile = fileOf(p, /^[\w.-]+\.zip$/i);
        if (zip && isHttps(p.url)) zip.href = p.url;
        if (zipLabel && zfile) zipLabel.textContent = `Descargar ${zfile}${validSize(p.size_mb) ? ` (${fmtSize(p.size_mb)})` : ''}`;
        if (shaZip && validSha(p.sha256)) shaZip.textContent = p.sha256.toLowerCase();
      }

      $$('[data-release="meta"]').forEach(el => { el.textContent = `Versión ${rel.version}${size ? ` · ${size}` : ''} · gratis`; });
    })
    .catch(() => {
      const warn = $('#dlWarn');
      if (warn) warn.hidden = false;
    });

  /* ---------- Copiar ---------- */
  const live = $('#copyLive');
  const copyText = async text => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch { /* sigue con el método clásico */ }
    }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('copy');
  };
  $$('.zv-copy').forEach(btn => {
    let t;
    btn.addEventListener('click', async () => {
      const src = document.getElementById(btn.dataset.copyFrom);
      if (!src) return;
      clearTimeout(t);
      btn.classList.remove('ok', 'err');
      try {
        await copyText(src.textContent.trim());
        btn.textContent = 'Copiado'; btn.classList.add('ok');
        if (live) live.textContent = 'Copiado al portapapeles.';
      } catch {
        btn.textContent = 'Selecciónalo'; btn.classList.add('err');
        if (live) live.textContent = 'No se pudo copiar. Selecciona el texto y cópialo a mano.';
        const range = document.createRange(); range.selectNodeContents(src);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      }
      t = setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('ok', 'err'); if (live) live.textContent = ''; }, 2200);
    });
  });

  /* ---------- Visor de capturas ---------- */
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbClose = $('#lbClose');
  if (lb && typeof lb.showModal === 'function') {
    let opener = null;
    $$('.zv-shot-btn').forEach(btn => btn.addEventListener('click', () => {
      const img = $('img', btn), cap = btn.closest('figure').querySelector('figcaption');
      opener = btn;
      lbImg.src = btn.dataset.full || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = cap ? cap.textContent : '';
      lb.showModal();
      lbClose.focus();
    }));
    lbClose.addEventListener('click', () => lb.close());
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', () => { if (opener) opener.focus(); });
  } else {
    // Sin <dialog>: abrir la imagen en la misma pestaña
    $$('.zv-shot-btn').forEach(btn => btn.addEventListener('click', () => { location.href = btn.dataset.full; }));
  }

  /* ---------- Aparición al hacer scroll ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---------- Scroll: progreso y cabecera ---------- */
  const prog = $('#progress'), top = $('#top');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    if (top) top.classList.toggle('scrolled', scrollY > 16);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Rayos de luz sobre la cuadrícula ---------- */
  const beams = $('#beams');
  if (!reduce && beams) {
    const GRID = 64;
    const make = () => {
      beams.textContent = '';
      const cols = Math.floor(innerWidth / GRID), rows = Math.floor((innerHeight * 0.7) / GRID);
      const nV = innerWidth < 640 ? 2 : 4, nH = innerWidth < 640 ? 1 : 3;
      for (let i = 0; i < nV + nH; i++) {
        const b = document.createElement('span');
        const v = i < nV;
        b.className = v ? 'beam-v' : 'beam-h';
        if (v) b.style.left = `${(1 + Math.floor(Math.random() * Math.max(1, cols - 1))) * GRID}px`;
        else b.style.top = `${(1 + Math.floor(Math.random() * Math.max(1, rows - 1))) * GRID}px`;
        b.style.setProperty('--t', `${(v ? 6 : 8) + Math.random() * 6}s`);
        b.style.setProperty('--dl', `${-Math.random() * 10}s`);
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

  /* ---------- Botones magnéticos y brillo de las tarjetas (escritorio) ---------- */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }
  $$('.svc').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));
})();

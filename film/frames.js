/*
  Rasec Dev · cuadros de la película: carga progresiva y dibujo en el lienzo.
  - Primero el cuadro inicial; después los más cercanos al cuadro que se está viendo; el resto solo cuando
    el usuario empieza a recorrer la película. Nunca más de CONCURRENCY descargas a la vez.
  - Se guardan como mucho `keep` cuadros decodificados; los más lejanos se sueltan (vuelven a salir de la caché).
  - Si el cuadro pedido aún no llegó, se dibuja el más cercano que ya esté listo: nunca un hueco.
*/

export class FrameSequence {
  constructor({ dir, count, keep = 60, ext = 'webp', concurrency = 6 }) {
    this.count = count;
    this.concurrency = concurrency;
    this.keep = keep;
    this.url = i => `${dir}/${String(i).padStart(3, '0')}.${ext}`;
    this.imgs = new Array(count).fill(null); // Image decodificada o null
    this.busy = new Set();
    this.failed = new Uint8Array(count); // intentos fallidos por cuadro (a los 2 se deja de pedir)
    this.target = 0;
    this.open = false;   // false: solo la ventana alrededor del cuadro actual
    this.onload = null;  // avisa para redibujar cuando llega un cuadro útil
  }

  // El cuadro que se quiere ver ahora (decide qué se descarga primero)
  want(f) {
    this.target = Math.max(0, Math.min(this.count - 1, Math.round(f)));
    this.pump();
  }

  // Permite cargar toda la secuencia, poco a poco y por cercanía
  release() { this.open = true; this.pump(); }

  pump() {
    while (this.busy.size < this.concurrency) {
      const i = this.nextToLoad();
      if (i < 0) return;
      this.load(i);
    }
  }

  nextToLoad() {
    const reach = this.open ? this.count : 16;
    for (let d = 0; d <= reach; d++) {
      for (const i of d ? [this.target + d, this.target - d] : [this.target]) {
        if (i >= 0 && i < this.count && !this.imgs[i] && !this.busy.has(i) && this.failed[i] < 2) return i;
      }
    }
    return -1;
  }

  load(i) {
    this.busy.add(i);
    let im;
    const done = ok => {
      this.busy.delete(i);
      if (ok) {
        this.imgs[i] = im;
        this.trim();
        if (this.onload && Math.abs(i - this.target) <= 2) this.onload(i);
        this.pump();
      } else {
        this.failed[i]++; // un cuadro que no llega no frena la página: se reintenta una vez, más tarde
        setTimeout(() => this.pump(), 1500);
      }
    };
    // createImageBitmap decodifica fuera del hilo principal y deja la imagen lista para dibujar (mucho más liviano en teléfonos)
    if (window.createImageBitmap) {
      fetch(this.url(i), { priority: i === 0 ? 'high' : 'auto' }).then(r => (r.ok ? r.blob() : Promise.reject()))
        .then(b => createImageBitmap(b)).then(bm => { im = bm; done(true); }, () => done(false));
    } else {
      im = new Image();
      im.decoding = 'async';
      im.src = this.url(i);
      im.decode().then(() => done(true), () => done(false));
    }
  }

  // Suelta los cuadros más lejanos cuando hay demasiados en memoria
  trim() {
    let n = 0;
    for (const im of this.imgs) if (im) n++;
    if (n <= this.keep) return;
    const loaded = this.imgs.map((im, i) => (im ? i : -1)).filter(i => i >= 0)
      .sort((a, b) => Math.abs(b - this.target) - Math.abs(a - this.target));
    for (const i of loaded.slice(0, n - this.keep)) { const im = this.imgs[i]; if (im.close) im.close(); else im.src = ''; this.imgs[i] = null; }
  }

  // El cuadro listo más cercano a i (o -1 si todavía no hay ninguno)
  nearest(i) {
    i = Math.max(0, Math.min(this.count - 1, i));
    for (let d = 0; d < this.count; d++) {
      if (this.imgs[i - d]) return i - d;
      if (this.imgs[i + d]) return i + d;
    }
    return -1;
  }
}

/*
  Dibuja la secuencia en un lienzo. `fit` decide el encuadre:
  - si el cuadro y el escenario tienen la misma orientación, lo llena (como object-fit: cover)
  - si no (cuadros anchos en un teléfono), se amplía por ancho y se centra: el portátil queda en el centro
*/
export class FrameCanvas {
  constructor(canvas, stage, { dprCap = 2, blend = true } = {}) {
    this.dprCap = dprCap;
    this.blend = blend; // fundir dos cuadros vecinos (en teléfonos no: la mitad de trabajo por cuadro)
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.key = '';
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.w = this.stage.clientWidth;
    this.h = this.stage.clientHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.key = '';
  }

  // Rectángulo (en px CSS) que ocupa un cuadro de iw×ih en el escenario
  place(iw, ih) {
    const mismatch = (this.h > this.w * 1.05) !== (ih > iw);
    const s = mismatch ? (this.w / iw) * 1.7 : Math.max(this.w / iw, this.h / ih);
    const w = iw * s, h = ih * s;
    return { x: (this.w - w) / 2, y: (this.h - h) / 2, w, h };
  }

  // Dibuja el cuadro f (con decimales: funde los dos vecinos). Devuelve el rectángulo usado.
  draw(seq, f, size) {
    const i0 = Math.floor(f), k = f - i0;
    const a = seq.nearest(i0);
    if (a < 0) return null;
    const b = this.blend && k > 0.02 && a === i0 && seq.imgs[i0 + 1] ? i0 + 1 : -1;
    const rect = this.place(size[0], size[1]);
    const key = `${a}|${b}|${b >= 0 ? k.toFixed(2) : ''}|${this.w}x${this.h}`;
    if (key === this.key) return rect;
    this.key = key;
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.drawImage(seq.imgs[a], rect.x, rect.y, rect.w, rect.h);
    if (b >= 0) { ctx.globalAlpha = k; ctx.drawImage(seq.imgs[b], rect.x, rect.y, rect.w, rect.h); ctx.globalAlpha = 1; }
    return rect;
  }
}

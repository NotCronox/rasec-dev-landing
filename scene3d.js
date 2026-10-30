/*
  Rasec Dev · fondo vivo (three.js r160, un solo canvas fijo detrás de la página)
  - Un shader dibuja la niebla del color del proyecto activo, polvo flotante, el resplandor detrás
    del objeto en pantalla (el portátil del inicio o el cristal del proyecto) y un banco de niebla al pasar
    de un proyecto a otro. El portátil y los cristales son videos prerrenderizados (film.js y landing.js).
  - La personalidad (window.Rasec.persona) cambia el mundo de color.
  - Sin WebGL, con movimiento reducido o en equipos flojos: html.no3d y el degradado de .studio.
  - ?no3d fuerza el respaldo, ?force3d fuerza el fondo.
*/
import * as THREE from 'three';

const root = document.documentElement;
const FX = window.RasecFX || { tier: 'high', reduce: false };
const params = new URLSearchParams(location.search);
const FORCE = params.has('force3d');

// Mundos de color: niebla, resplandor y puntos (colores reales de cada marca)
const WORLDS = {
  neutral: { fog: '#0c1220', glow: '#4a6aa8', dots: '#a9bde0' },
  brasa:   { fog: '#05313b', glow: '#ef7d4f', dots: '#86d7c8' },
  barber:  { fog: '#05362f', glow: '#c89a3a', dots: '#e9d7ae' },
  vitrina: { fog: '#21140f', glow: '#e58fb6', dots: '#d9b46a' },
  zavitar: { fog: '#14151b', glow: '#ff9a1f', dots: '#ffbd6b' },
};

const fail = () => { root.classList.remove('has3d'); root.classList.add('no3d'); };

if (params.has('no3d') || (!FORCE && (FX.tier === 'static' || FX.reduce))) fail();
else {
  try { start(); } catch (err) { console.warn('[fondo] sin WebGL:', err); fail(); }
}

function start() {
  const canvas = document.getElementById('scene');
  const HIGH = FX.tier === 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL no disponible');
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fail(); }, false);
  const touch = matchMedia('(pointer: coarse)').matches;
  // La niebla es suave: no necesita la resolución completa de la pantalla
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1 : 1.25));
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const U = {
    uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uScroll: { value: 0 },
    uFog: { value: new THREE.Color(WORLDS.neutral.fog) }, uGlow: { value: new THREE.Color(WORLDS.neutral.glow) },
    uDots: { value: new THREE.Color(WORLDS.neutral.dots) },
    uFocus: { value: new THREE.Vector2(0.5, 0.35) }, uGlowAmt: { value: 0 }, uMist: { value: 0 },
  };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      #define OCT ${HIGH ? 4 : 2}
      uniform float uTime, uDpr, uScroll, uGlowAmt, uMist;
      uniform vec2 uRes, uFocus;
      uniform vec3 uFog, uGlow, uDots;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
        return mix(mix(h21(i), h21(i + vec2(1., 0.)), u.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), u.x), u.y); }
      float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < OCT; i++){ s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; } return s; }
      void main(){
        vec2 fc = gl_FragCoord.xy, uv = fc / uRes;
        float asp = uRes.x / uRes.y;
        vec2 p = vec2((uv.x - .5) * asp, uv.y - .5);
        float sc = uScroll * uDpr / uRes.y;
        // Niebla en dos capas: deriva sola y sube con el scroll, como si la cámara bajara
        vec2 q = p * 1.5 + vec2(0., -sc * .55);
        float f = fbm(q + vec2(uTime * .018, uTime * .011));
        float f2 = fbm(q * 1.7 + f * 1.3 - vec2(uTime * .024, 0.));
        vec3 col = uFog * (.32 + 1.4 * f2 * f2);
        // Banco de niebla al pasar de un proyecto a otro
        col += (uFog * 2.6 + uDots * .035) * uMist * (.35 + 1.3 * f2);
        // Resplandor detrás del objeto en escena
        vec2 fp = vec2((uFocus.x - .5) * asp, uFocus.y - .5);
        float d = length((p - fp) * vec2(1., 1.12));
        col += uGlow * uGlowAmt * (exp(-d * d * 5.) * .5 + exp(-d * 2.4) * .08) * (.6 + .8 * f);
        // Viñeta
        col *= mix(1., smoothstep(1.4, .1, length(p * vec2(.82, 1.))), .85);
        // Polvo flotante en dos capas: motas sueltas de distinto tamaño que derivan despacio; la lejana se mueve menos con el scroll
        float dust = 0.;
        for (int L = 0; L < 2; L++) {
          float fl = float(L), cell = (58. + fl * 54.) * uDpr;
          vec2 g = vec2(fc.x, fc.y + uScroll * uDpr * (.22 + fl * .2));
          vec2 id = floor(g / cell);
          float r = h21(id + fl * 13.7);
          vec2 off = (vec2(h21(id + 7.1), h21(id + 3.7)) - .5) * cell * .7;
          off += vec2(sin(uTime * .21 + r * 6.283), cos(uTime * .17 + r * 4.1)) * cell * .09;
          float sz = mix(.5, 1.6 + fl * .9, h21(id + 1.3)) * uDpr;
          float m = smoothstep(sz, sz * .15, length(mod(g, cell) - cell * .5 - off)) * step(.58, r);
          dust += m * (.55 + .45 * sin(uTime * (.5 + r) + r * 6.283)) * (.7 - fl * .3);
        }
        col += uDots * dust * .1 * (.35 + f) * smoothstep(1.3, .1, length(p));
        // Grano de película, muy suave
        col += (h21(fc + fract(uTime * 7.) * 91.) - .5) * .009;
        gl_FragColor = vec4(max(col, 0.), 1.);
        #include <colorspace_fragment>
      }`,
  }));
  bg.frustumCulled = false;
  scene.add(bg);

  /* ---------- Tamaño ---------- */
  let W = 0, H = 0;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    const dpr = renderer.getPixelRatio();
    U.uRes.value.set(W * dpr, H * dpr); U.uDpr.value = dpr;
  };
  resize();
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });

  /* ---------- Personalidad: mundo de color ---------- */
  let persona = null;
  const target = { fog: new THREE.Color(), glow: new THREE.Color(), dots: new THREE.Color() };
  const setWorld = id => { const w = WORLDS[id] || WORLDS.neutral; target.fog.set(w.fog); target.glow.set(w.glow); target.dots.set(w.dots); };
  setWorld(null);
  if (window.Rasec) window.Rasec.on(id => { persona = id; setWorld(id); });

  /* ---------- Qué hay en pantalla: el portátil del inicio y los cristales ---------- */
  const film = document.querySelector('.film-stage');
  const crystals = [...document.querySelectorAll('.project-crystal')];
  const bodies = [...document.querySelectorAll('.project-body')];
  const gauss = x => Math.exp(-x * x);
  const damp = (cur, tgt, lambda, dt) => cur + (tgt - cur) * (1 - Math.exp(-lambda * dt / 1000));

  let focusX = 0.5, focusY = 0.35, skip = 0, first = true, lastY = -1;
  const frame = (t, dt) => {
    const k = 1 - Math.exp(-3 * dt / 1000);
    U.uFog.value.lerp(target.fog, k); U.uGlow.value.lerp(target.glow, k); U.uDots.value.lerp(target.dots, k);
    U.uTime.value = t / 1000;
    U.uScroll.value = scrollY;

    // Resplandor detrás del elemento más visible
    let best = 0, fx = focusX, fy = focusY, amt = 0;
    const consider = (el, strength, cy = 0.5) => {
      const r = el.getBoundingClientRect();
      const vis = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0)) * Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0));
      if (vis > best) {
        best = vis;
        fx = (r.left + r.width / 2) / W; fy = 1 - (r.top + r.height * cy) / H;
        amt = strength * Math.min(1, vis / (W * H * 0.35));
      }
    };
    if (film) consider(film, 0.22, 0.62);
    crystals.forEach(c => consider(c, 0.32));
    focusX = damp(focusX, fx, 6, dt); focusY = damp(focusY, fy, 6, dt);
    U.uFocus.value.set(focusX, focusY);
    U.uGlowAmt.value = damp(U.uGlowAmt.value, amt * (persona ? 1 : 0.6), 4, dt);

    // Banco de niebla cuando el borde entre dos proyectos cruza el centro de la pantalla
    let mist = 0;
    bodies.forEach(b => { const r = b.getBoundingClientRect(); mist = Math.max(mist, gauss((r.top - H * 0.5) / (H * 0.2)) * 0.8); });
    U.uMist.value = damp(U.uMist.value, mist, 8, dt);

    // La niebla es lenta: con la página quieta basta media frecuencia; al hacer scroll, todos los cuadros
    const moving = scrollY !== lastY; lastY = scrollY;
    if (!first && root.classList.contains('film-covering')) return; // la película lo tapa entero
    if (!first && !moving && (skip = (skip + 1) % 2)) return;
    renderer.render(scene, camera);
    if (first) { first = false; root.classList.remove('no3d'); root.classList.add('has3d'); }
  };

  const loop = FX.loop ? FX.loop((t, dt) => frame(t, dt)) : null;
  if (loop) loop.start();
  else { let last = 0; const f = t => { frame(t, Math.min(50, last ? t - last : 16)); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); }
}

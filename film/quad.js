/*
  Rasec Dev · coloca un elemento HTML de w×h sobre cuatro esquinas cualesquiera (perspectiva exacta),
  con una sola transformación matrix3d. Se usa para poner la captura real de Brasa Marina
  exactamente sobre el vidrio del portátil renderizado y llevarla después a pantalla completa.
  Esquinas: [[x, y] arriba-izq, arriba-der, abajo-der, abajo-izq] en px del escenario.
*/
const adj = m => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];
const mul = (a, b) => {
  const c = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    c[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
  }
  return c;
};
const mulv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const basis = (p1, p2, p3, p4) => {
  const m = [p1[0], p2[0], p3[0], p1[1], p2[1], p3[1], 1, 1, 1];
  const v = mulv(adj(m), [p4[0], p4[1], 1]);
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
};

export function quadMatrix(w, h, [tl, tr, br, bl]) {
  const t = mul(basis(tl, tr, bl, br), adj(basis([0, 0], [w, 0], [0, h], [w, h])));
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  return `matrix3d(${[t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].map(n => +n.toFixed(8)).join(',')})`;
}

// Mezcla dos juegos de esquinas (k de 0 a 1)
export const mixQuad = (a, b, k) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]);

// Esquinas de un rectángulo de w×h que cubre todo el escenario (como object-fit: cover)
export function coverQuad(w, h, sw, sh) {
  const s = Math.max(sw / w, sh / h), cw = w * s, ch = h * s, x = (sw - cw) / 2, y = (sh - ch) / 2;
  return [[x, y], [x + cw, y], [x + cw, y + ch], [x, y + ch]];
}

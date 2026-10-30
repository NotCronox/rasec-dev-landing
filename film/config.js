/*
  Rasec Dev · la película del inicio: todo lo que se puede cambiar sin tocar la lógica.
  - Las secuencias son cuadros renderizados en Blender (video-landing/blender/escena.py → exportar.py; ver LEEME.md ahí).
    Para cambiar la secuencia basta con reemplazar la carpeta y ajustar count/size aquí.
  - El tiempo de la película se mide en «unidades»: cada una ocupa UNIT de scroll (en svh).
*/
export const SEQUENCES = {
  // Escritorio y tabletas en horizontal: dos cuadros por cuadro de la escena, con desenfoque de movimiento
  wide: { dir: 'assets/film/cine/wide', count: 601, size: [1600, 900], screen: 'assets/film/cine/wide/pantalla.json' },
  // Teléfonos en vertical: el mismo recorrido con encuadre vertical
  tall: { dir: 'assets/film/cine/tall', count: 601, size: [810, 1440], screen: 'assets/film/cine/tall/pantalla.json' },
};

// Scroll por unidad de tiempo de la película
export const UNIT = { wide: 50, tall: 34 }; // svh

// Cuadro de la secuencia donde la cámara está dentro de la pantalla: ahí termina la entrada y empieza la salida
export const INSIDE = 400;

// Línea de tiempo (unidades). Los cuadros cubren la entrada y la salida; en medio mandan las capas HTML.
export const T = {
  frames: [0, 10],      // cuadros 0 → INSIDE (aparición, revelación, giro y entrada en la pantalla)
  copyOut: [0, 0.9],    // el titular se va con el primer gesto de scroll
  line: [6.4, 8.6],     // una línea mientras el portátil gira hacia nosotros
  screenIn: [9.2, 9.5], // la captura real de Brasa toma el lugar de la pantalla renderizada (es la misma imagen)
  enter: [10, 11],      // la pantalla crece hasta llenar el viewport: estamos dentro de Brasa Marina
  panels: [             // cada proyecto: cuándo llega (at, dur del travelling) y desde cuándo corre su video (play),
    { id: 'brasa',   at: 10.5, dur: 0.6, play: [11.4, 13.4] },   // ya con la pantalla o el travelling asentados
    { id: 'barber',  at: 13.6, dur: 1.4, play: [15.2, 17.4] },
    { id: 'vitrina', at: 17.6, dur: 1.4, play: [19.2, 21.4] },
    { id: 'zavitar', at: 21.6, dur: 1.4, play: [23.2, 25.4] },
  ],
  exit: [25.6, 26.6],   // Zavitar vuelve a la pantalla del portátil y reaparece la escena
  exitFrames: [25.6, 29.6], // cuadros INSIDE → último: la cámara sale, se queda de frente y baja hasta fundirse con la página
  end: 29.6,
};

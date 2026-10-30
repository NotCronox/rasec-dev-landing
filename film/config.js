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
export const UNIT = { wide: 50, tall: 42 }; // svh

// Cuadro de la secuencia donde la cámara está dentro de la pantalla: ahí termina la entrada y empieza la salida
export const INSIDE = 400;

// Línea de tiempo (unidades). Los cuadros cubren la entrada y la salida; en medio mandan las capas HTML.
export const T = {
  frames: [0, 10],      // cuadros 0 → INSIDE (aparición, revelación, giro y entrada en la pantalla)
  copyOut: [0, 0.9],    // el titular se va con el primer gesto de scroll
  line: [6.4, 8.6],     // una línea mientras el portátil gira hacia nosotros
  screenIn: [9.2, 9.5], // la captura real de Brasa toma el lugar de la pantalla renderizada (es la misma imagen)
  enter: [10, 11],      // la pantalla crece hasta llenar el viewport: estamos dentro de Brasa Marina
  panels: [             // cada proyecto: cuándo entra, cuánto dura su entrada y con qué gesto
    { id: 'brasa',   at: 10.5, dur: 0.6, reveal: 'screen' },
    { id: 'barber',  at: 13.2, dur: 1.1, reveal: 'pole' },  // franjas diagonales que se abren, como el poste de una barbería
    { id: 'vitrina', at: 15.9, dur: 1.1, reveal: 'door' },  // una puerta de vidrio que se cierra frente a ti
    { id: 'zavitar', at: 18.6, dur: 1.6, reveal: 'wheel' }, // Vitrina cae al centro de la rueda de formatos y se abre Zavitar
  ],
  phoneIn: 0.55,        // el teléfono sube cuando su panel ya entró (fracción de la entrada)
  exit: [21.4, 22.4],   // Zavitar vuelve a la pantalla del portátil y reaparece la escena
  exitFrames: [21.4, 25.4], // cuadros INSIDE → último: la cámara sale, se queda de frente y baja hasta el negro
  end: 25.4,
};

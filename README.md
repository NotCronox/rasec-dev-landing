# Rasec Dev · Landing

Landing page / portafolio de Rasec Dev para el link de la bio de Instagram.

Muestra de entrada los proyectos en vivo y redirige a cada sitio con una transición animada:

- **Brasa Marina** (restaurante): https://brasamarina-rasecdev.netlify.app
- **Rasec Barber Studio** (barbería): https://rasecbarberstudio-rasecdev.netlify.app
- **Vitrina** (catálogo marca blanca con pedidos por WhatsApp): https://vitrina-demo.pages.dev

## Tecnologías

- HTML, CSS y JavaScript, sin frameworks ni paso de build.
- Imágenes en WebP optimizadas (~480 KB en total) para que cargue rápido desde el navegador de Instagram.

## Estructura

- `index.html`: contenido de la página.
- `styles.css`: diseño y animaciones.
- `main.js`: entrada del título, rayos del fondo, inclinación de las tarjetas, línea del proceso y transición al abrir un proyecto.
- `assets/`: capturas de los proyectos.

## Diseño

Tipografía Geist / Geist Mono, fondo oscuro neutro con un único acento azul.

Animaciones: entrada del título palabra por palabra, rayos de luz que recorren la cuadrícula del fondo, borde de luz en las
tarjetas, inclinación sutil con el cursor, pantallas de celular con scroll automático, línea de proceso que se llena al hacer
scroll y transición al abrir un proyecto. Se desactivan solas si el usuario tiene activado "reducir movimiento".

## Ejecutar en local

```bash
py -m http.server 5510
```

Y abrir http://localhost:5510.



## Contacto

- Instagram: [@rasec.dev](https://instagram.com/rasec.dev)

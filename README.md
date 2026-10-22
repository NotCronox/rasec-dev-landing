# Rasec Dev · Landing

Landing page / portafolio de Rasec Dev para el link de la bio de Instagram.

**En vivo:** https://rasec-dev.pages.dev (Cloudflare Pages: cada push a `main` se publica solo)

Muestra de entrada los proyectos y lleva a la demo de cada uno con una transición animada. Las demos tienen el
panel administrativo abierto y guardan los cambios solo en el navegador de quien las prueba:

| Proyecto | Demo (panel abierto) | Sitio con Supabase |
| --- | --- | --- |
| **Brasa Marina** (restaurante) | https://brasamarina-demo.pages.dev | https://brasamarina-rasecdev.pages.dev |
| **Rasec Barber Studio** (barbería) | https://rasecbarberstudio-demo.pages.dev | https://rasecbarberstudio-rasecdev.pages.dev |
| **Vitrina** (catálogo con pedidos por WhatsApp) | https://vitrina-demo.pages.dev | https://vitrina-tienda.pages.dev |

El proyecto 04 es **Zavitar**, un programa de escritorio para Windows (beta 0.1). No tiene demo web: su tarjeta abre la
página propia del programa, https://rasec-dev.pages.dev/zavitar/, con la presentación y la descarga.

## Tecnologías

- HTML, CSS y JavaScript, sin frameworks ni paso de build.
- Imágenes en WebP optimizadas (~580 KB en total, contando las de Zavitar) para que cargue rápido desde el navegador de Instagram.

## Estructura

- `index.html`: contenido de la página.
- `styles.css`: diseño y animaciones.
- `main.js`: entrada del título, rayos del fondo, inclinación de las tarjetas, línea del proceso y transición al abrir un proyecto.
- `assets/`: capturas de los proyectos.
- `zavitar/`: página de presentación y descarga de Zavitar.
  - `index.html`: contenido (cómo funciona, características, formatos, capturas, descarga, beta, licencia y contacto).
  - `zavitar.css`: estilos propios del programa (usa `../styles.css` como base; el acento mandarina `#FF9A1F` se usa solo en el logo, la rueda y el brillo de la descarga).
  - `zavitar.js`: lee `release.json`, botones *Copiar*, visor de capturas, aparición al hacer scroll y rayos del fondo.
  - `release.json`: datos de la versión publicada. La descarga principal es el instalador `.exe`; mientras `sha256` o `size_mb` valgan `"PENDING"` la página no los muestra. El zip queda como versión portable. Los enlaces de descarga funcionan cuando el release está publicado en GitHub; si el archivo no carga, la página enlaza a la página de versiones.
  - `assets/`: capturas reales del programa en WebP y `og.webp` (1200 × 630) para compartir el enlace.

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

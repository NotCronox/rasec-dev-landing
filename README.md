# Rasec Dev · Landing

Landing page / portafolio de Rasec Dev para el link de la bio de Instagram.

Muestra de entrada los dos proyectos en vivo y redirige a cada sitio con una transición animada:

- **Brasa Marina** (restaurante): https://brasamarina-rasecdev.netlify.app
- **Rasec Barber Studio** (barbería): https://rasecbarberstudio-rasecdev.netlify.app

## Tecnologías

- HTML, CSS y JavaScript, sin frameworks ni paso de build.
- Imágenes en WebP optimizadas (~330 KB en total) para que cargue rápido desde el navegador de Instagram.

## Estructura

- `index.html`: contenido de la página.
- `styles.css`: diseño y animaciones.
- `main.js`: loader, fondo de partículas, efecto 3D de las tarjetas, transición al abrir un proyecto.
- `assets/`: capturas de los proyectos.

## Animaciones

Pantalla de carga, fondo de partículas interactivo, título que entra palabra por palabra, palabra rotativa con efecto
scramble, tarjetas con borde de luz giratorio e inclinación 3D, pantallas de celular con scroll automático, chispas al
tocar, marquesinas y botón flotante de WhatsApp. Se desactivan solas si el usuario tiene activado "reducir movimiento".

## Ejecutar en local

```bash
py -m http.server 5510
```

Y abrir http://localhost:5510.



## Contacto

- Instagram: [@rasec.dev](https://instagram.com/rasec.dev)

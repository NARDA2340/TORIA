# TORIA

Sitio estático desplegado en Netlify.

## Estructura

```
public/           Contenido publicado (HTML/CSS/assets)
  index.html      Página principal
netlify.toml      Configuración de despliegue
```

No hay paso de build: Netlify publica directamente el contenido de `public/`.

## Conectar con Netlify (una sola vez)

1. Entrar a https://app.netlify.com → **Add new site** → **Import an existing project**.
2. Elegir **GitHub** y autorizar el acceso al repositorio `NARDA2340/TORIA`.
3. Seleccionar el repositorio. Netlify lee `netlify.toml`, así que los campos ya vienen bien:
   - Build command: *(vacío)*
   - Publish directory: `public`
4. **Deploy site**.

A partir de ahí, cada push a la rama de producción dispara un deploy automático.
Las ramas y pull requests generan *deploy previews* con su propia URL.

## Desarrollo local

Cualquier servidor estático sirve, por ejemplo:

```bash
python3 -m http.server 8000 --directory public
```

# TORIA Studio

Landing de producto de TORIA Studio — velas, difusores y aromatizantes artesanales.
Sitio estático desplegado en Netlify.

## Estructura

```
public/           Contenido publicado
  index.html      Landing completa (HTML + CSS en un solo archivo)
netlify.toml      Configuración de despliegue
```

No hay paso de build: Netlify publica directamente el contenido de `public/`.

## Conectar con Netlify (una sola vez)

1. https://app.netlify.com → **Add new project** → **Import an existing project**
2. **GitHub** → autorizar el acceso al repositorio `NARDA2340/TORIA`
3. Netlify lee `netlify.toml`, así que los campos ya vienen cargados:
   - Build command: *(vacío)*
   - Publish directory: `public`
4. En **Branch to deploy**, elegir la rama que se quiera publicar
5. **Deploy**

Después de eso, cada push dispara un deploy automático.

## Pendientes antes de difundir el link

- [ ] **Fotos reales.** El hero y las cards de producto usan degradados de color como
      placeholder. Buscar `PLACEHOLDER` en `public/index.html`. Recomendado: hero
      1200x1400px y productos 800x800px, en WebP y por debajo de 200KB.
- [ ] **Notas de aroma sin confirmar.** Seis productos tienen las notas inferidas por
      el nombre, no confirmadas. Están marcados con `CONFIRMAR` en los comentarios del
      HTML: Cherry, Spicy Orange, Costa Azul, Aire Limpio, Exotic Bliss y Aura Tropical.
- [ ] **Precios.** Verificar que $35.000 (velas) y $45.000 (fragancias) estén vigentes.
- [ ] **Sección de reseñas.** Se quitó del HTML porque los testimonios y las métricas
      del borrador eran inventados. Los estilos siguen en el CSS para volver a armarla
      cuando haya reseñas reales.
- [ ] **Imagen para compartir.** Falta `og:image`, que es la foto que aparece al pegar
      el link en WhatsApp o Instagram.

## Desarrollo local

```bash
python3 -m http.server 8000 --directory public
```

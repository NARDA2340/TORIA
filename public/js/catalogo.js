/**
 * catalogo.js — render del catálogo, pestañas y buscador
 *
 * Dibuja las filas de producto en layout alternado (una imagen-izquierda,
 * la siguiente imagen-derecha) dentro de cada pestaña. El "salteado" lo hace
 * el CSS con :nth-child(even); acá solo generamos el HTML en orden.
 */

import { formatearPrecio, normalizar } from './datos.js';

/** Pestaña visible en este momento. */
let tabActiva = 'velas';

/**
 * Crea la fila de un producto.
 * @param {Object} p Producto del catálogo
 * @returns {HTMLElement}
 */
function crearFila(p) {
  const art = document.createElement('article');
  art.className = 'producto';
  art.dataset.productoId = p.id;

  // Texto buscable: nombre + aroma + tipo, sin tildes.
  art.dataset.buscable = normalizar(`${p.nombre} ${p.aroma} ${p.tipo} ${p.descripcion}`);

  const etiquetaDestacada = p.etiqueta === 'Más vendida' ? ' producto__etiqueta--destacada' : '';

  // innerHTML es seguro acá: todo el contenido sale de nuestro propio
  // data/products.json, nunca de algo que escriba una visitante.

  art.innerHTML = `
    <div class="producto__media producto__media--${p.gradiente}">
      <img class="producto__img"
           src="${p.imagen}"
           alt="${p.tipo} artesanal TORIA ${p.nombre}"
           loading="lazy" decoding="async" data-img-opcional>
      ${p.etiqueta ? `<span class="producto__etiqueta${etiquetaDestacada}">${p.etiqueta}</span>` : ''}
    </div>

    <div class="producto__texto">
      <p class="producto__tipo">${p.tipo}</p>
      <h3 class="producto__nombre">${p.nombre}</h3>
      <p class="producto__aroma">${p.aroma}</p>
      <p class="producto__descripcion">${p.descripcion}</p>
      <p class="producto__precio">${formatearPrecio(p.precio)}</p>
      <button class="btn btn--primario btn--cuadrado" type="button"
              data-accion="agregar" data-id="${p.id}">
        Agregar al carrito
      </button>
    </div>
  `;

  return art;
}

/**
 * Dibuja todos los productos en su pestaña correspondiente.
 * @param {Object} catalogo
 */
export function renderizar(catalogo) {
  const paneles = {
    velas: document.querySelector('[data-panel="velas"]'),
    aromatizantes: document.querySelector('[data-panel="aromatizantes"]'),
  };

  Object.values(paneles).forEach((panel) => { if (panel) panel.innerHTML = ''; });

  for (const producto of catalogo.productos) {
    const panel = paneles[producto.categoria];
    if (panel) panel.appendChild(crearFila(producto));
  }
}

/**
 * Cambia de pestaña. Mantiene sincronizados los atributos ARIA para que
 * un lector de pantalla anuncie bien cuál está activa.
 * @param {string} nombre 'velas' | 'aromatizantes'
 */
export function activarTab(nombre) {
  tabActiva = nombre;

  document.querySelectorAll('.tabs__btn').forEach((btn) => {
    const activa = btn.dataset.tab === nombre;
    btn.classList.toggle('tabs__btn--activa', activa);
    btn.setAttribute('aria-selected', String(activa));
    btn.tabIndex = activa ? 0 : -1;
  });

  document.querySelectorAll('.catalogo__panel').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== nombre;
  });
}

/** Conecta los clics y el manejo de flechas del teclado en las pestañas. */
export function conectarTabs() {
  const botones = Array.from(document.querySelectorAll('.tabs__btn'));

  botones.forEach((btn) => {
    btn.addEventListener('click', () => activarTab(btn.dataset.tab));

    // Flechas ← → para moverse entre pestañas (patrón ARIA de tablist).
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();

      const i = botones.indexOf(btn);
      const siguiente = e.key === 'ArrowRight'
        ? botones[(i + 1) % botones.length]
        : botones[(i - 1 + botones.length) % botones.length];

      activarTab(siguiente.dataset.tab);
      siguiente.focus();
    });
  });
}

/**
 * Filtra los productos por texto. Mientras hay búsqueda activa se muestran
 * las dos pestañas juntas, porque lo que se busca puede estar en cualquiera.
 * @param {string} texto
 */
export function filtrar(texto) {
  const consulta = normalizar(texto).trim();
  const paneles = document.querySelectorAll('.catalogo__panel');
  const estado = document.querySelector('[data-buscador-estado]');
  const sinResultados = document.querySelector('[data-sin-resultados]');

  // Sin texto: volvemos al comportamiento normal de pestañas.
  if (!consulta) {
    activarTab(tabActiva);
    document.querySelectorAll('.producto').forEach((f) => { f.hidden = false; });
    if (estado) estado.textContent = '';
    if (sinResultados) sinResultados.hidden = true;
    return;
  }

  paneles.forEach((panel) => { panel.hidden = false; });

  let encontrados = 0;
  document.querySelectorAll('.producto').forEach((fila) => {
    const coincide = fila.dataset.buscable.includes(consulta);
    fila.hidden = !coincide;
    if (coincide) encontrados++;
  });

  if (estado) {
    estado.textContent = encontrados === 1
      ? '1 producto encontrado'
      : `${encontrados} productos encontrados`;
  }
  if (sinResultados) sinResultados.hidden = encontrados > 0;
}

/** Limpia la búsqueda y vuelve a la pestaña que estaba activa. */
export function limpiarBusqueda() {
  filtrar('');
}

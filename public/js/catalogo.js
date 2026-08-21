/**
 * catalogo.js — render del catálogo, pestañas y buscador
 *
 * Hay una pestaña por línea de producto (velas, aromatizantes, difusores).
 * Dentro de cada pestaña, los productos se agrupan por tamaño, y cada grupo
 * se dibuja en layout alternado: una fila imagen-izquierda, la siguiente
 * imagen-derecha. El "salteado" lo hace el CSS con :nth-child(even), por eso
 * cada grupo va en su propio contenedor: así la alternancia arranca de nuevo.
 */

import { formatearPrecio, normalizar } from './datos.js';

/** Pestaña visible en este momento. */
let tabActiva = 'velas';

/**
 * Crea la fila de un producto.
 * innerHTML es seguro acá: todo sale de nuestro data/products.json,
 * nunca de algo que escriba una visitante.
 * @param {Object} p
 * @returns {HTMLElement}
 */
function crearFila(p) {
  const art = document.createElement('article');
  art.className = 'producto';
  art.dataset.productoId = p.id;
  art.dataset.buscable = normalizar(
    `${p.nombre} ${p.aroma} ${p.tipo} ${p.familia} ${p.peso} ${p.descripcion}`
  );

  art.innerHTML = `
    <div class="producto__media producto__media--${p.gradiente}">
      <img class="producto__img"
           src="${p.imagen}"
           alt="${p.tipo} artesanal TORIA ${p.nombre}: ${p.aroma}"
           loading="lazy" decoding="async" data-img-opcional>
      <span class="producto__etiqueta">${p.familia}</span>
    </div>

    <div class="producto__texto">
      <p class="producto__tipo">${p.tipo} · ${p.peso}</p>
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
 * Dibuja una línea de producto completa dentro de su panel.
 * @param {HTMLElement} panel
 * @param {Array<Object>} productos Los de esa línea
 * @param {Object} linea Datos de la línea (nombre, título)
 */
function renderizarLinea(panel, productos, linea) {
  panel.innerHTML = '';

  // Línea sin productos todavía: no dejamos la pestaña en blanco.
  if (productos.length === 0) {
    panel.innerHTML = `
      <div class="catalogo__proximamente">
        <h3 class="catalogo__proximamente-titulo">${linea.titulo}</h3>
        <p>Todavía no están cargados acá, pero los hacemos.
        Escribinos y te contamos qué hay disponible.</p>
        <a class="btn btn--borde btn--cuadrado"
           href="https://wa.me/5493516695868?text=%C2%A1Hola%20TORIA!%20Quer%C3%ADa%20consultar%20por%20${encodeURIComponent(linea.nombre.toLowerCase())}"
           target="_blank" rel="noopener">Consultar por WhatsApp</a>
      </div>
    `;
    return;
  }

  // Agrupamos por tamaño, respetando el orden del JSON.
  const grupos = new Map();
  for (const p of productos) {
    if (!grupos.has(p.peso)) grupos.set(p.peso, []);
    grupos.get(p.peso).push(p);
  }

  // Si hay un solo tamaño, el encabezado de grupo no aporta nada.
  const mostrarEncabezados = grupos.size > 1;

  for (const [peso, delGrupo] of grupos) {
    if (mostrarEncabezados) {
      const h4 = document.createElement('h4');
      h4.className = 'catalogo__grupo-titulo';
      h4.dataset.grupoTitulo = peso;

      // Si todo el grupo comparte precio, lo mostramos al lado del tamaño.
      const precios = new Set(delGrupo.map((p) => p.precio));
      h4.textContent = precios.size === 1
        ? `${peso} — ${formatearPrecio(delGrupo[0].precio)}`
        : peso;

      panel.appendChild(h4);
    }

    const cont = document.createElement('div');
    cont.className = 'catalogo__grupo';
    delGrupo.forEach((p) => cont.appendChild(crearFila(p)));
    panel.appendChild(cont);
  }
}

/**
 * Dibuja todas las líneas en sus paneles.
 * @param {Object} catalogo
 */
export function renderizar(catalogo) {
  for (const linea of catalogo.lineas) {
    const panel = document.querySelector(`[data-panel="${linea.id}"]`);
    if (!panel) continue;

    const productos = catalogo.productos.filter((p) => p.linea === linea.id);
    renderizarLinea(panel, productos, linea);
  }
}

/**
 * Cambia de pestaña, manteniendo sincronizados los atributos ARIA.
 * @param {string} nombre
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

/** Clics y flechas del teclado en las pestañas (patrón ARIA de tablist). */
export function conectarTabs() {
  const botones = Array.from(document.querySelectorAll('.tabs__btn'));

  botones.forEach((btn) => {
    btn.addEventListener('click', () => activarTab(btn.dataset.tab));

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
 * Filtra por texto. Mientras hay búsqueda, se muestran todas las líneas
 * juntas, porque lo buscado puede estar en cualquiera.
 * @param {string} texto
 */
export function filtrar(texto) {
  const consulta = normalizar(texto).trim();
  const estado = document.querySelector('[data-buscador-estado]');
  const sinResultados = document.querySelector('[data-sin-resultados]');

  // Sin texto: volvemos al comportamiento normal de pestañas.
  if (!consulta) {
    activarTab(tabActiva);
    document.querySelectorAll('.producto, .catalogo__grupo, .catalogo__grupo-titulo, .catalogo__proximamente')
      .forEach((el) => { el.hidden = false; });
    if (estado) estado.textContent = '';
    if (sinResultados) sinResultados.hidden = true;
    return;
  }

  document.querySelectorAll('.catalogo__panel').forEach((p) => { p.hidden = false; });
  // El bloque "en preparación" no es un resultado de búsqueda.
  document.querySelectorAll('.catalogo__proximamente').forEach((el) => { el.hidden = true; });

  let encontrados = 0;
  document.querySelectorAll('.producto').forEach((fila) => {
    const coincide = fila.dataset.buscable.includes(consulta);
    fila.hidden = !coincide;
    if (coincide) encontrados++;
  });

  // Escondemos los grupos que quedaron sin ningún producto visible,
  // junto con su encabezado, para que no queden títulos huérfanos.
  document.querySelectorAll('.catalogo__grupo').forEach((grupo) => {
    const vacio = grupo.querySelectorAll('.producto:not([hidden])').length === 0;
    grupo.hidden = vacio;

    const titulo = grupo.previousElementSibling;
    if (titulo?.classList.contains('catalogo__grupo-titulo')) titulo.hidden = vacio;
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

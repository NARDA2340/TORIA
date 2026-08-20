/**
 * main.js — punto de entrada
 *
 * Carga el catálogo, dibuja todo y conecta los eventos.
 * La lógica vive en los otros módulos; acá solo se orquesta.
 */

import { cargarCatalogo, buscarProducto } from './datos.js';
import * as carrito from './carrito.js';
import * as catalogo from './catalogo.js';
import * as ui from './ui.js';
import { renderizarCarrito } from './carrito-ui.js';
import { iniciarPagoMercadoPago } from './checkout.js';

/** Catálogo ya cargado, disponible para todos los handlers. */
let datos = null;

/* ---------------------------------------------------------
   Arranque
   --------------------------------------------------------- */

async function iniciar() {
  carrito.inicializar();

  try {
    datos = await cargarCatalogo();
  } catch (error) {
    console.error('[TORIA]', error);
    mostrarErrorCatalogo();
    return;
  }

  catalogo.renderizar(datos);
  catalogo.conectarTabs();
  catalogo.activarTab('velas');

  ui.prepararImagenes();

  // Cada vez que el carrito cambie, se redibuja el drawer.
  carrito.suscribir(() => renderizarCarrito(datos));
  renderizarCarrito(datos);

  conectarEventos();
}

/** Si el JSON del catálogo no carga, al menos que quede el camino a WhatsApp. */
function mostrarErrorCatalogo() {
  const panel = document.querySelector('[data-panel="velas"]');
  if (!panel) return;
  panel.innerHTML = `
    <p class="catalogo__sin-resultados">
      No pudimos cargar el catálogo en este momento.
      Escribinos por <a href="https://wa.me/5493516695868">WhatsApp</a> y te contamos qué hay disponible.
    </p>
  `;
}

/* ---------------------------------------------------------
   Eventos
   --------------------------------------------------------- */

function conectarEventos() {
  // Un solo listener para toda la página: los botones se identifican
  // por su atributo data-accion (delegación de eventos).
  document.addEventListener('click', manejarClick);

  // Buscador
  const inputBusqueda = document.querySelector('[data-buscador-input]');
  inputBusqueda?.addEventListener('input', (e) => catalogo.filtrar(e.target.value));

  // Cupón
  document.querySelector('[data-cupon-form]')?.addEventListener('submit', manejarCupon);

  // Teclado: Escape cierra lo que esté abierto, Tab queda atrapado en el drawer.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (ui.carritoAbierto()) ui.cerrarCarrito();
      else ui.alternarMenu(false);
    }
    ui.atraparFoco(e);
  });
}

/**
 * @param {MouseEvent} e
 */
function manejarClick(e) {
  /* --- Links que además cambian de pestaña --- */
  const tabLink = e.target.closest('[data-tab-link]');
  if (tabLink) {
    catalogo.limpiarBusqueda();
    catalogo.activarTab(tabLink.dataset.tabLink);
    ui.alternarMenu(false);
    ui.alternarBuscador(false);
    // No hacemos preventDefault: el href="#velas" hace el scroll suave solo.
    return;
  }

  /* --- Clic en el fondo oscuro --- */
  if (e.target.matches('[data-overlay]')) {
    ui.cerrarCarrito();
    return;
  }

  const boton = e.target.closest('[data-accion]');
  if (!boton) return;

  const { accion, id } = boton.dataset;

  switch (accion) {
    case 'abrir-menu':
      ui.alternarMenu();
      break;

    case 'alternar-buscador':
      ui.alternarBuscador();
      break;

    case 'abrir-carrito':
      ui.abrirCarrito();
      break;

    case 'cerrar-carrito':
      ui.cerrarCarrito();
      break;

    case 'agregar':
      agregarProducto(id);
      break;

    case 'sumar':
      carrito.cambiarCantidad(id, +1);
      break;

    case 'restar':
      carrito.cambiarCantidad(id, -1);
      break;

    case 'quitar':
      carrito.quitar(id);
      break;

    case 'checkout':
      finalizarCompra(boton);
      break;

    // 'whatsapp' es un <a> con href ya armado: no necesita nada acá.
  }
}

/**
 * Agrega un producto y avisa qué pasó.
 * @param {string} id
 */
function agregarProducto(id) {
  const producto = buscarProducto(datos, id);
  if (!producto) return;

  const { agregado, enTope } = carrito.agregar(id);

  if (!agregado && enTope) {
    ui.mostrarAviso(`Máximo ${carrito.CANTIDAD_MAX} unidades de ${producto.nombre}.`);
    return;
  }

  ui.mostrarAviso(`Agregaste ${producto.nombre} al carrito.`);
  ui.latirContador();
}

/**
 * @param {SubmitEvent} e
 */
function manejarCupon(e) {
  e.preventDefault();

  const input = document.querySelector('[data-cupon-input]');
  const estado = document.querySelector('[data-cupon-estado]');
  const resultado = carrito.aplicarCupon(datos, input.value);

  if (estado) {
    estado.textContent = resultado.mensaje;
    estado.className = `cupon__estado cupon__estado--${resultado.ok ? 'ok' : 'error'}`;
  }
}

/**
 * Finaliza la compra con Mercado Pago. Si falla, muestra el motivo y
 * deja a la vista el botón de WhatsApp como alternativa.
 * @param {HTMLButtonElement} boton
 */
async function finalizarCompra(boton) {
  const error = document.querySelector('[data-checkout-error]');
  const textoOriginal = boton.textContent;

  boton.disabled = true;
  boton.textContent = 'Generando el link de pago…';
  if (error) error.hidden = true;

  const resultado = await iniciarPagoMercadoPago();

  // Si salió bien, el navegador ya está redirigiendo a Mercado Pago.
  if (!resultado.ok) {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    if (error) {
      error.textContent = resultado.mensaje;
      error.hidden = false;
    }
  }
}

/* --------------------------------------------------------- */

iniciar();

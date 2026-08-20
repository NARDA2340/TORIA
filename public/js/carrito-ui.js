/**
 * carrito-ui.js — dibuja el contenido del drawer
 *
 * Se ejecuta cada vez que el carrito cambia (via carrito.suscribir).
 * No toma decisiones sobre el estado: solo refleja lo que dice carrito.js.
 */

import { formatearPrecio } from './datos.js';
import { CANTIDAD_MIN, CANTIDAD_MAX, calcularTotales, cantidadTotal, cuponAplicado } from './carrito.js';
import { armarLinkWhatsapp } from './checkout.js';

/**
 * Crea una línea de producto dentro del carrito.
 * @param {{producto: Object, cantidad: number, subtotal: number}} item
 * @returns {HTMLElement}
 */
function crearLinea({ producto, cantidad, subtotal }) {
  const li = document.createElement('li');
  li.className = 'linea';

  const enTope = cantidad >= CANTIDAD_MAX;

  li.innerHTML = `
    <div class="linea__media linea__media--${producto.gradiente}">
      <img class="linea__img" src="${producto.imagen}" alt="" loading="lazy" data-img-opcional>
    </div>

    <div class="linea__info">
      <h3 class="linea__nombre">${producto.nombre}</h3>
      <p class="linea__unitario">${formatearPrecio(producto.precio)} c/u</p>

      <div class="linea__fila">
        <div class="cantidad">
          <button class="cantidad__btn" type="button"
                  data-accion="restar" data-id="${producto.id}"
                  aria-label="Quitar una unidad de ${producto.nombre}"
                  ${cantidad <= CANTIDAD_MIN ? 'disabled' : ''}>−</button>
          <span class="cantidad__valor" aria-live="polite">${cantidad}</span>
          <button class="cantidad__btn" type="button"
                  data-accion="sumar" data-id="${producto.id}"
                  aria-label="Agregar una unidad de ${producto.nombre}"
                  ${enTope ? 'disabled' : ''}>+</button>
        </div>
        <span class="linea__subtotal">${formatearPrecio(subtotal)}</span>
      </div>

      ${enTope ? `<p class="linea__tope">Máximo ${CANTIDAD_MAX} por producto.</p>` : ''}

      <button class="linea__quitar" type="button" data-accion="quitar" data-id="${producto.id}">
        Quitar
      </button>
    </div>
  `;

  return li;
}

/**
 * Redibuja todo el carrito: contador del header, lista, totales y links.
 * @param {Object} catalogo
 */
export function renderizarCarrito(catalogo) {
  const totales = calcularTotales(catalogo);

  /* --- Contador del header --- */
  const contador = document.querySelector('[data-carrito-contador]');
  const unidades = cantidadTotal();
  if (contador) {
    contador.textContent = String(unidades);
    contador.hidden = unidades === 0;
  }

  /* --- Lista de productos --- */
  const lista = document.querySelector('[data-carrito-lista]');
  const vacio = document.querySelector('[data-carrito-vacio]');
  const pie = document.querySelector('[data-carrito-pie]');

  if (lista) {
    lista.innerHTML = '';
    totales.lineas.forEach((item) => lista.appendChild(crearLinea(item)));
  }

  const hayProductos = totales.lineas.length > 0;
  if (vacio) vacio.hidden = hayProductos;
  if (pie) pie.hidden = !hayProductos;

  /* --- Totales --- */
  const elSubtotal = document.querySelector('[data-total-subtotal]');
  const filaDescuento = document.querySelector('[data-fila-descuento]');
  const labelDescuento = document.querySelector('[data-total-descuento-label]');
  const elDescuento = document.querySelector('[data-total-descuento]');
  const elTotal = document.querySelector('[data-total-final]');

  if (elSubtotal) elSubtotal.textContent = formatearPrecio(totales.subtotal);
  if (elTotal) elTotal.textContent = formatearPrecio(totales.total);

  if (filaDescuento) {
    const hayDescuento = totales.descuento > 0;
    filaDescuento.hidden = !hayDescuento;
    if (hayDescuento) {
      if (labelDescuento) labelDescuento.textContent = `Cupón ${totales.cupon.codigo} (${totales.cupon.descuento}%)`;
      if (elDescuento) elDescuento.textContent = `-${formatearPrecio(totales.descuento)}`;
    }
  }

  /* --- Cupón: dejamos el input mostrando el código aplicado --- */
  const inputCupon = document.querySelector('[data-cupon-input]');
  const aplicado = cuponAplicado();
  if (inputCupon && aplicado && inputCupon.value.trim().toUpperCase() !== aplicado) {
    inputCupon.value = aplicado;
  }

  /* --- Link de WhatsApp con el pedido armado --- */
  const linkWhatsapp = document.querySelector('[data-accion="whatsapp"]');
  if (linkWhatsapp && hayProductos) {
    linkWhatsapp.href = armarLinkWhatsapp(totales);
  }

  /* --- Imágenes chicas que todavía no existen --- */
  document.querySelectorAll('[data-carrito-lista] [data-img-opcional]').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) img.classList.add('oculta');
    img.addEventListener('error', () => img.classList.add('oculta'));
  });
}

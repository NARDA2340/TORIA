/**
 * vuelta.js — qué pasa cuando la clienta vuelve de Mercado Pago
 *
 * Después de pagar, Mercado Pago la devuelve al sitio con parámetros en la
 * URL (?pago=exito&payment_id=...). Sin esto, volvía a la home como si nada
 * hubiera pasado, con el carrito todavía lleno y sin ninguna confirmación.
 *
 * Acá leemos ese resultado, mostramos qué pasó y —solo si el pago se
 * aprobó— vaciamos el carrito.
 *
 * IMPORTANTE: esto es solo lo que ve la clienta. La venta de verdad queda
 * registrada en la cuenta de Mercado Pago, que es la fuente confiable.
 * Un parámetro en la URL se puede escribir a mano, así que nunca hay que
 * dar un pedido por pagado solo porque la pantalla lo diga.
 */

import { formatearPrecio } from './datos.js';
import { calcularTotales, vaciar, estaVacio } from './carrito.js';
import { armarLinkWhatsapp } from './checkout.js';

const WHATSAPP = '5493516695868';

/**
 * Arma el mensaje para que la clienta nos pase los datos de envío.
 * Lo construimos ANTES de vaciar el carrito, para que incluya el detalle.
 * @param {Object} totales
 * @param {string|null} pagoId
 * @returns {string}
 */
function linkDatosDeEnvio(totales, pagoId) {
  const lineas = totales.lineas.map(
    ({ producto, cantidad }) => `• ${cantidad}x ${producto.nombre}`
  );

  const partes = [
    '¡Hola TORIA! Acabo de pagar mi pedido por Mercado Pago.',
    '',
    ...lineas,
    `Total: ${formatearPrecio(totales.total)}`,
  ];

  if (pagoId) partes.push(`N° de pago: ${pagoId}`);

  partes.push('', 'Mis datos para el envío:', 'Nombre:', 'Dirección:', 'Localidad y CP:');

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(partes.join('\n'))}`;
}

/** Los tres desenlaces posibles. */
const MENSAJES = {
  exito: {
    titulo: '¡Listo, recibimos tu pago!',
    texto: 'Ya nos llegó. Para poder despacharte el pedido necesitamos tus datos de envío: mandanoslos por WhatsApp y lo preparamos.',
    accion: 'Mandar mis datos de envío',
    vaciarCarrito: true,
  },
  pendiente: {
    titulo: 'Tu pago quedó pendiente',
    texto: 'Mercado Pago todavía lo está procesando. Puede tardar un rato, sobre todo si pagaste en efectivo. Cuando se acredite te avisamos.',
    accion: 'Consultar por WhatsApp',
    vaciarCarrito: false,
  },
  error: {
    titulo: 'El pago no se pudo completar',
    texto: 'No se descontó nada. Tu carrito quedó como estaba, así que podés intentar de nuevo con otro medio de pago, o cerrar el pedido por WhatsApp.',
    accion: 'Pedir por WhatsApp',
    vaciarCarrito: false,
  },
};

/**
 * Revisa la URL y, si venimos de Mercado Pago, muestra el resultado.
 * @param {Object} catalogo
 */
export function revisarVueltaDePago(catalogo) {
  const params = new URLSearchParams(window.location.search);
  const resultado = params.get('pago');

  if (!resultado || !MENSAJES[resultado]) return;

  const config = MENSAJES[resultado];
  const panel = document.querySelector('[data-vuelta]');
  if (!panel) return;

  // El detalle del pedido, capturado antes de tocar el carrito.
  const totales = calcularTotales(catalogo);
  const habiaProductos = !estaVacio();
  const pagoId = params.get('payment_id') || params.get('collection_id');

  panel.dataset.estado = resultado;
  panel.querySelector('[data-vuelta-titulo]').textContent = config.titulo;
  panel.querySelector('[data-vuelta-texto]').textContent = config.texto;

  const acciones = panel.querySelector('[data-vuelta-acciones]');
  acciones.innerHTML = '';

  const link = document.createElement('a');
  link.className = 'btn btn--primario btn--cuadrado';
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = config.accion;

  if (resultado === 'exito' && habiaProductos) {
    link.href = linkDatosDeEnvio(totales, pagoId);
  } else if (habiaProductos) {
    link.href = armarLinkWhatsapp(totales);
  } else {
    link.href = `https://wa.me/${WHATSAPP}`;
  }
  acciones.appendChild(link);

  // Volver a la tienda
  const volver = document.createElement('a');
  volver.className = 'btn btn--borde btn--cuadrado';
  volver.href = '#catalogo';
  volver.textContent = 'Volver a la colección';
  acciones.appendChild(volver);

  panel.hidden = false;

  // Solo vaciamos si el pago se aprobó. Si falló o quedó pendiente,
  // el carrito tiene que seguir ahí para poder reintentar.
  if (config.vaciarCarrito) vaciar();

  // Limpiamos la URL para que un F5 no vuelva a mostrar el cartel.
  window.history.replaceState({}, '', window.location.pathname);

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

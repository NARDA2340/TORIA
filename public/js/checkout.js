/**
 * checkout.js — las dos formas de cerrar el pedido
 *
 * 1. Mercado Pago (Checkout Pro): llama a la función serverless, que crea la
 *    "preference" del lado del servidor y devuelve un init_point. Redirigimos ahí.
 * 2. WhatsApp: arma un mensaje con el detalle del pedido. No necesita backend,
 *    sirve para salir a vender antes de tener Mercado Pago andando.
 */

import { formatearPrecio } from './datos.js';
import { detalleParaBackend } from './carrito.js';

/** Número de WhatsApp de TORIA (formato internacional, sin + ni espacios). */
const WHATSAPP = '5493516695868';

/**
 * Ruta de la función serverless.
 * - Netlify: /.netlify/functions/create-preference
 * - Vercel:  /api/create-preference  (ver README)
 */
const ENDPOINT = '/.netlify/functions/create-preference';

/* ---------------------------------------------------------
   WhatsApp
   --------------------------------------------------------- */

/**
 * Arma el link de WhatsApp con el detalle del pedido.
 * @param {{lineas: Array, subtotal: number, descuento: number, total: number, cupon: Object|null}} totales
 * @returns {string} URL lista para poner en un href
 */
export function armarLinkWhatsapp(totales) {
  const lineas = totales.lineas.map(
    ({ producto, cantidad, subtotal }) =>
      `• ${cantidad}x ${producto.nombre} — ${formatearPrecio(subtotal)}`
  );

  const partes = [
    '¡Hola TORIA! Quiero hacer este pedido:',
    '',
    ...lineas,
    '',
    `Subtotal: ${formatearPrecio(totales.subtotal)}`,
  ];

  if (totales.cupon) {
    partes.push(`Cupón ${totales.cupon.codigo}: -${formatearPrecio(totales.descuento)}`);
  }

  partes.push(`Total: ${formatearPrecio(totales.total)}`);

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(partes.join('\n'))}`;
}

/* ---------------------------------------------------------
   Mercado Pago
   --------------------------------------------------------- */

/**
 * Pide la preference al backend y redirige a Mercado Pago.
 *
 * El navegador manda SOLO ids y cantidades. Los precios los pone la función
 * serverless leyendo data/products.json, así que nadie puede cambiar el
 * precio desde la consola del navegador.
 *
 * @returns {Promise<{ok: boolean, mensaje?: string}>}
 */
export async function iniciarPagoMercadoPago() {
  const detalle = detalleParaBackend();

  if (detalle.items.length === 0) {
    return { ok: false, mensaje: 'El carrito está vacío.' };
  }

  let respuesta;
  try {
    respuesta = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detalle),
    });
  } catch {
    return {
      ok: false,
      mensaje: 'No pudimos conectarnos para procesar el pago. Probá de nuevo o pedí por WhatsApp.',
    };
  }

  // 404 = la función todavía no está desplegada (falta configurar Mercado Pago).
  if (respuesta.status === 404) {
    return {
      ok: false,
      mensaje: 'El pago online todavía no está habilitado. Cerrá tu pedido por WhatsApp y lo coordinamos.',
    };
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    // Sin JSON de vuelta: normalmente significa que la función todavía no
    // está desplegada (por ejemplo, corriendo el sitio con un servidor estático).
    return {
      ok: false,
      mensaje: 'El pago online todavía no está disponible. Cerrá tu pedido por WhatsApp y lo coordinamos.',
    };
  }

  if (!respuesta.ok || !datos.init_point) {
    return {
      ok: false,
      mensaje: datos.error || 'No pudimos generar el link de pago. Probá por WhatsApp.',
    };
  }

  // Redirección a Mercado Pago.
  window.location.href = datos.init_point;
  return { ok: true };
}

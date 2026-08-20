/**
 * carrito.js — estado del carrito
 *
 * Guarda qué productos agregó la clienta y cuántos, más el cupón aplicado.
 * Persiste en localStorage para que no se pierda al recargar la página.
 *
 * IMPORTANTE: el carrito guarda SOLO ids y cantidades, nunca precios.
 * Los precios se resuelven siempre contra data/products.json al momento de
 * calcular. Así, si mañana cambiás un precio, los carritos viejos que estén
 * guardados en el navegador de alguien se recalculan solos con el precio nuevo.
 */

import { buscarProducto } from './datos.js';

/** Clave de localStorage. Si algún día cambia la forma del objeto, subir la versión. */
const CLAVE = 'toria_carrito_v1';

/** Límites de cantidad por producto (pedidos artesanales, tandas chicas). */
export const CANTIDAD_MIN = 1;
export const CANTIDAD_MAX = 6;

/** @type {{ lineas: Array<{id: string, cantidad: number}>, cupon: string|null }} */
let estado = { lineas: [], cupon: null };

/** Funciones a las que avisar cuando el carrito cambia. */
const suscriptores = [];

/* ---------------------------------------------------------
   Persistencia
   --------------------------------------------------------- */

/** Lee el carrito guardado. Si está corrupto, arranca de cero sin romper la página. */
export function inicializar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return;

    const guardado = JSON.parse(crudo);
    if (!guardado || !Array.isArray(guardado.lineas)) return;

    // Sanitizamos: solo ids string y cantidades dentro del rango permitido.
    estado.lineas = guardado.lineas
      .filter((l) => l && typeof l.id === 'string')
      .map((l) => ({
        id: l.id,
        cantidad: acotar(Number(l.cantidad) || CANTIDAD_MIN),
      }));

    estado.cupon = typeof guardado.cupon === 'string' ? guardado.cupon : null;
  } catch {
    // localStorage bloqueado (modo incógnito estricto) o JSON inválido:
    // seguimos con el carrito vacío en memoria.
    estado = { lineas: [], cupon: null };
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Si no se puede guardar, el carrito igual funciona durante la visita.
  }
}

/* ---------------------------------------------------------
   Suscripción (para que la UI se redibuje sola)
   --------------------------------------------------------- */

/** @param {Function} fn Se ejecuta cada vez que el carrito cambia. */
export function suscribir(fn) {
  suscriptores.push(fn);
}

function notificar() {
  guardar();
  suscriptores.forEach((fn) => fn());
}

/* ---------------------------------------------------------
   Operaciones
   --------------------------------------------------------- */

function acotar(n) {
  return Math.min(CANTIDAD_MAX, Math.max(CANTIDAD_MIN, n));
}

/**
 * Agrega una unidad. Si el producto ya estaba, suma uno (hasta el tope).
 * @param {string} id
 * @returns {{ agregado: boolean, enTope: boolean }}
 */
export function agregar(id) {
  const linea = estado.lineas.find((l) => l.id === id);

  if (!linea) {
    estado.lineas.push({ id, cantidad: 1 });
    notificar();
    return { agregado: true, enTope: false };
  }

  if (linea.cantidad >= CANTIDAD_MAX) {
    return { agregado: false, enTope: true };
  }

  linea.cantidad += 1;
  notificar();
  return { agregado: true, enTope: linea.cantidad >= CANTIDAD_MAX };
}

/**
 * Suma o resta unidades con los botones + / −.
 * @param {string} id
 * @param {number} delta +1 o -1
 */
export function cambiarCantidad(id, delta) {
  const linea = estado.lineas.find((l) => l.id === id);
  if (!linea) return;

  linea.cantidad = acotar(linea.cantidad + delta);
  notificar();
}

/** Saca un producto del carrito por completo. */
export function quitar(id) {
  estado.lineas = estado.lineas.filter((l) => l.id !== id);
  if (estado.lineas.length === 0) estado.cupon = null;
  notificar();
}

/** Vacía el carrito (se usa después de una compra exitosa). */
export function vaciar() {
  estado = { lineas: [], cupon: null };
  notificar();
}

/** Cantidad total de unidades, para el contador del header. */
export function cantidadTotal() {
  return estado.lineas.reduce((suma, l) => suma + l.cantidad, 0);
}

/** true si no hay nada agregado. */
export function estaVacio() {
  return estado.lineas.length === 0;
}

/* ---------------------------------------------------------
   Cupones
   --------------------------------------------------------- */

/**
 * Valida y aplica un cupón contra la lista de data/products.json.
 *
 * OJO: este chequeo es solo para mostrar el descuento en pantalla.
 * La función serverless vuelve a validar el cupón antes de cobrar,
 * así que no alcanza con tocar el JavaScript para pagar menos.
 *
 * @param {Object} catalogo
 * @param {string} codigo
 * @returns {{ ok: boolean, mensaje: string }}
 */
export function aplicarCupon(catalogo, codigo) {
  const limpio = (codigo || '').trim().toUpperCase();

  if (!limpio) {
    estado.cupon = null;
    notificar();
    return { ok: false, mensaje: 'Escribí un código para aplicar.' };
  }

  const cupon = catalogo.cupones[limpio];
  if (!cupon) {
    return { ok: false, mensaje: 'Ese código no existe o ya venció.' };
  }

  estado.cupon = limpio;
  notificar();
  return { ok: true, mensaje: `Listo: ${cupon.descripcion}.` };
}

/** Saca el cupón aplicado. */
export function quitarCupon() {
  estado.cupon = null;
  notificar();
}

/** Código de cupón aplicado, o null. */
export function cuponAplicado() {
  return estado.cupon;
}

/* ---------------------------------------------------------
   Cálculo de totales
   --------------------------------------------------------- */

/**
 * Arma el detalle completo del pedido con los precios actuales del catálogo.
 *
 * @param {Object} catalogo
 * @returns {{
 *   lineas: Array<{producto: Object, cantidad: number, subtotal: number}>,
 *   subtotal: number,
 *   descuento: number,
 *   total: number,
 *   cupon: {codigo: string, descuento: number, descripcion: string}|null
 * }}
 */
export function calcularTotales(catalogo) {
  const lineas = [];
  let subtotal = 0;

  for (const l of estado.lineas) {
    const producto = buscarProducto(catalogo, l.id);

    // Si un producto se sacó del catálogo, se descarta del carrito en silencio.
    if (!producto) continue;

    const sub = producto.precio * l.cantidad;
    subtotal += sub;
    lineas.push({ producto, cantidad: l.cantidad, subtotal: sub });
  }

  let descuento = 0;
  let cupon = null;

  if (estado.cupon && catalogo.cupones[estado.cupon]) {
    const datos = catalogo.cupones[estado.cupon];
    // Redondeamos a peso entero para que el total no muestre centavos.
    descuento = Math.round(subtotal * (datos.descuento / 100));
    cupon = { codigo: estado.cupon, ...datos };
  }

  return { lineas, subtotal, descuento, total: subtotal - descuento, cupon };
}

/**
 * Detalle mínimo que se le manda a la función serverless.
 * Solo ids, cantidades y el código de cupón: los precios los pone el backend.
 * @returns {{ items: Array<{id: string, cantidad: number}>, cupon: string|null }}
 */
export function detalleParaBackend() {
  return {
    items: estado.lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })),
    cupon: estado.cupon,
  };
}

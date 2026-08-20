/**
 * datos.js — acceso al catálogo
 *
 * Todo el catálogo (productos, precios y cupones) vive en un solo archivo:
 * `data/products.json`. Ese mismo archivo lo lee la función serverless de
 * Mercado Pago, así que el precio que se cobra y el que se muestra siempre
 * salen del mismo lugar.
 *
 * >>> PARA CAMBIAR PRECIOS: editar data/products.json y nada más. <<<
 */

/** Cache en memoria: el JSON se pide una sola vez por visita. */
let catalogoPromesa = null;

/**
 * Carga el catálogo. Devuelve { moneda, cupones, productos }.
 * @returns {Promise<Object>}
 */
export function cargarCatalogo() {
  if (!catalogoPromesa) {
    catalogoPromesa = fetch('data/products.json')
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar el catálogo (HTTP ${r.status})`);
        return r.json();
      });
  }
  return catalogoPromesa;
}

/**
 * Busca un producto por id dentro de un catálogo ya cargado.
 * @param {Object} catalogo
 * @param {string} id
 * @returns {Object|undefined}
 */
export function buscarProducto(catalogo, id) {
  return catalogo.productos.find((p) => p.id === id);
}

/**
 * Formatea un número como precio argentino: 35000 -> "$35.000".
 * Sin centavos, porque los productos son de precio redondo.
 * @param {number} valor
 * @returns {string}
 */
export function formatearPrecio(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Normaliza texto para buscar sin tildes ni mayúsculas.
 * "Cítrica" -> "citrica"
 * @param {string} texto
 * @returns {string}
 */
export function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
